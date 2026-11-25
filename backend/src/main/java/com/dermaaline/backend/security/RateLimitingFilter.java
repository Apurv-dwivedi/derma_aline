package com.dermaaline.backend.security;

import com.dermaaline.backend.service.RateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Production Rate Limiting Filter to mitigate brute-force authentication,
 * OTP flooding, contact submission spam, and appointment booking abuse.
 * Uses database-backed shared buckets when {@link RateLimitService} is active.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 15;
    private static final int MAX_OTP_REQUESTS_PER_MINUTE = 6;
    private static final int MAX_SUBMISSION_REQUESTS_PER_MINUTE = 6;
    private static final long ONE_MINUTE_MS = 60_000L;

    @Autowired(required = false)
    private RateLimitService rateLimitService;

    // Fallback local sliding window bucket tracker used when no DB service is injected
    private final Map<String, RequestBucket> clientBuckets = new ConcurrentHashMap<>();

    void setRateLimitService(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    private static class RequestBucket {
        long windowStart;
        int requestCount;

        RequestBucket(long now) {
            this.windowStart = now;
            this.requestCount = 0;
        }

        synchronized boolean allowRequest(int maxRequests, long now) {
            if (now - windowStart > ONE_MINUTE_MS) {
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

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Allow CORS preflight requests without rate limiting
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        int maxAllowed = 0;
        String bucketCategory = null;

        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/internal-login")) {
            maxAllowed = MAX_AUTH_REQUESTS_PER_MINUTE;
            bucketCategory = "login";
        } else if (path.startsWith("/api/auth/forgot-password") || path.startsWith("/api/auth/send-otp")
                || path.startsWith("/api/auth/resend-otp") || path.startsWith("/api/auth/password/request-otp")
                || path.startsWith("/api/auth/admin-password/request-otp")) {
            maxAllowed = MAX_OTP_REQUESTS_PER_MINUTE;
            bucketCategory = "otp-dispatch";
        } else if (path.startsWith("/api/auth/register") || path.startsWith("/api/auth/verify-email")
                || path.startsWith("/api/auth/reset-password") || path.startsWith("/api/auth/verify-otp")
                || path.startsWith("/api/auth/verify-reset-token") || path.startsWith("/api/auth/sync-supabase-user")
                || path.startsWith("/api/auth/sync-password") || path.startsWith("/api/auth/change-password")
                || path.startsWith("/api/auth/staff/activate")) {
            maxAllowed = MAX_AUTH_REQUESTS_PER_MINUTE;
            bucketCategory = "auth-action";
        } else if (path.startsWith("/api/contact") && "POST".equalsIgnoreCase(method)) {
            maxAllowed = MAX_SUBMISSION_REQUESTS_PER_MINUTE;
            bucketCategory = "contact";
        } else if ((path.startsWith("/api/appointments") || path.startsWith("/api/client/appointments")) && "POST".equalsIgnoreCase(method)) {
            maxAllowed = MAX_SUBMISSION_REQUESTS_PER_MINUTE;
            bucketCategory = "appointment";
        }

        if (bucketCategory != null) {
            String bucketKey = ip + ":" + bucketCategory;
            boolean allowed;
            if (rateLimitService != null) {
                allowed = rateLimitService.allowRequest(bucketKey, maxAllowed, ONE_MINUTE_MS, now);
            } else {
                RequestBucket bucket = clientBuckets.computeIfAbsent(bucketKey, k -> new RequestBucket(now));
                allowed = bucket.allowRequest(maxAllowed, now);
            }

            if (!allowed) {
                logger.warn("Rate limit exceeded on route: {}", path);
                response.setStatus(429); // 429 Too Many Requests
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"success\":false,\"message\":\"Too many attempts. For clinic security, please wait 60 seconds before trying again.\"}");
                return;
            }
        }

        // Periodic light cleanup when bucket size exceeds threshold
        if (clientBuckets.size() > 5000) {
            clientBuckets.entrySet().removeIf(entry -> now - entry.getValue().windowStart > ONE_MINUTE_MS * 5);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Resolves client IP safely without trusting client-spoofed leading X-Forwarded-For entries.
     * Trusts proxy forwarding headers only when the immediate TCP remote peer is a non-loopback internal proxy,
     * selecting the rightmost non-internal hop (appended by edge/reverse proxy ingress).
     */
    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr() != null ? request.getRemoteAddr().trim() : "unknown";
        if (!isInternalProxyIp(remoteAddr) || isLoopbackIp(remoteAddr)) {
            return remoteAddr;
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            String[] hops = xForwardedFor.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String candidate = hops[i].trim();
                if (!candidate.isEmpty() && !isInternalProxyIp(candidate) && !isLoopbackIp(candidate)) {
                    return candidate;
                }
            }
            String lastHop = hops[hops.length - 1].trim();
            if (!lastHop.isEmpty()) {
                return lastHop;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.trim().isEmpty()) {
            return realIp.trim();
        }
        return remoteAddr;
    }

    private boolean isLoopbackIp(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }

    private boolean isInternalProxyIp(String ip) {
        if (ip == null) {
            return false;
        }
        return ip.startsWith("10.")
                || ip.startsWith("192.168.")
                || ip.startsWith("100.64.")
                || ip.matches("^172\\.(1[6-9]|2\\d|3[0-1])\\..*");
    }
}
