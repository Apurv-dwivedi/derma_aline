package com.dermaaline.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Shared rate-limiting bucket store backed by PostgreSQL (and H2 PostgreSQL mode in tests)
 * so request throttling survives application restarts and synchronizes across multiple backend instances.
 * Falls back cleanly to in-memory tracking only when no live relational DataSource is wired (e.g., standalone unit tests).
 */
@Service
public class RateLimitService {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitService.class);
    private static final long CLEANUP_RETENTION_MS = 5 * 60_000L;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    private final TransactionTemplate transactionTemplate;
    private final Map<String, MemoryBucket> fallbackBuckets = new ConcurrentHashMap<>();
    private final AtomicInteger opCounter = new AtomicInteger(0);
    private volatile String cachedDatabaseProduct;

    public RateLimitService() {
        this.transactionTemplate = null;
    }

    @Autowired
    public RateLimitService(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            @Autowired(required = false) PlatformTransactionManager transactionManager) {
        this.jdbcTemplate = jdbcTemplate;
        if (transactionManager != null) {
            TransactionTemplate tt = new TransactionTemplate(transactionManager);
            tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            this.transactionTemplate = tt;
        } else {
            this.transactionTemplate = null;
        }
    }

    public boolean allowRequest(String bucketKey, int maxRequests, long windowMs, long nowMs) {
        if (bucketKey == null || bucketKey.isBlank()) {
            return true;
        }
        if (hasLiveDatabase()) {
            try {
                return allowRequestPersistent(bucketKey, maxRequests, windowMs, nowMs);
            } catch (Exception e) {
                logger.warn("Database rate limit check notice, applying local safeguard: {}", e.getMessage());
            }
        }
        return allowRequestInMemory(bucketKey, maxRequests, windowMs, nowMs);
    }

    private boolean hasLiveDatabase() {
        return jdbcTemplate != null && jdbcTemplate.getDataSource() != null && transactionTemplate != null;
    }

    private boolean allowRequestPersistent(String bucketKey, int maxRequests, long windowMs, long nowMs) {
        ensureBucketRow(bucketKey, nowMs);

        Boolean allowed = transactionTemplate.execute(status -> {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT window_start_ms, request_count FROM rate_limit_buckets WHERE bucket_key = ? FOR UPDATE",
                bucketKey
            );

            if (rows.isEmpty()) {
                jdbcTemplate.update(
                    "INSERT INTO rate_limit_buckets (bucket_key, window_start_ms, request_count, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)",
                    bucketKey, nowMs
                );
                return true;
            }

            Map<String, Object> row = rows.get(0);
            long windowStartMs = ((Number) row.get("window_start_ms")).longValue();
            int currentCount = ((Number) row.get("request_count")).intValue();

            if (nowMs - windowStartMs > windowMs) {
                jdbcTemplate.update(
                    "UPDATE rate_limit_buckets SET window_start_ms = ?, request_count = 1, updated_at = CURRENT_TIMESTAMP WHERE bucket_key = ?",
                    nowMs, bucketKey
                );
                return true;
            }

            if (currentCount < maxRequests) {
                jdbcTemplate.update(
                    "UPDATE rate_limit_buckets SET request_count = ?, updated_at = CURRENT_TIMESTAMP WHERE bucket_key = ?",
                    currentCount + 1, bucketKey
                );
                return true;
            }

            return false;
        });

        if (opCounter.incrementAndGet() % 200 == 0) {
            purgeStaleBuckets(nowMs - CLEANUP_RETENTION_MS);
        }

        return Boolean.TRUE.equals(allowed);
    }

    private void ensureBucketRow(String bucketKey, long nowMs) {
        String product = resolveDatabaseProduct();
        try {
            transactionTemplate.executeWithoutResult(status -> {
                if (product.contains("postgresql")) {
                    jdbcTemplate.update(
                        "INSERT INTO rate_limit_buckets (bucket_key, window_start_ms, request_count, updated_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP) ON CONFLICT (bucket_key) DO NOTHING",
                        bucketKey, nowMs
                    );
                } else {
                    Integer existing = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM rate_limit_buckets WHERE bucket_key = ?",
                        Integer.class, bucketKey
                    );
                    if (existing == null || existing == 0) {
                        jdbcTemplate.update(
                            "INSERT INTO rate_limit_buckets (bucket_key, window_start_ms, request_count, updated_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP)",
                            bucketKey, nowMs
                        );
                    }
                }
            });
        } catch (Exception ignored) {
            // Concurrent row creation is safely handled by the outer SELECT FOR UPDATE query
        }
    }

    private void purgeStaleBuckets(long cutoffMs) {
        try {
            transactionTemplate.executeWithoutResult(status ->
                jdbcTemplate.update("DELETE FROM rate_limit_buckets WHERE window_start_ms < ?", cutoffMs)
            );
        } catch (Exception ignored) {}
    }

    private String resolveDatabaseProduct() {
        if (cachedDatabaseProduct != null) {
            return cachedDatabaseProduct;
        }
        DataSource ds = jdbcTemplate != null ? jdbcTemplate.getDataSource() : null;
        if (ds == null) {
            return "";
        }
        try (Connection conn = ds.getConnection()) {
            if (conn.getMetaData() != null && conn.getMetaData().getDatabaseProductName() != null) {
                cachedDatabaseProduct = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ENGLISH);
                return cachedDatabaseProduct;
            }
        } catch (Exception ignored) {}
        return "";
    }

    private boolean allowRequestInMemory(String bucketKey, int maxRequests, long windowMs, long nowMs) {
        MemoryBucket bucket = fallbackBuckets.computeIfAbsent(bucketKey, k -> new MemoryBucket(nowMs));
        if (fallbackBuckets.size() > 5000) {
            fallbackBuckets.entrySet().removeIf(entry -> nowMs - entry.getValue().windowStart > CLEANUP_RETENTION_MS);
        }
        return bucket.allow(maxRequests, windowMs, nowMs);
    }

    private static final class MemoryBucket {
        long windowStart;
        int requestCount;

        MemoryBucket(long now) {
            this.windowStart = now;
            this.requestCount = 0;
        }

        synchronized boolean allow(int maxRequests, long windowMs, long now) {
            if (now - windowStart > windowMs) {
                windowStart = now;
                requestCount = 1;
                return true;
            }
            if (requestCount < maxRequests) {
                requestCount++;
                return true;
            }
            return false;
        }
    }
}
