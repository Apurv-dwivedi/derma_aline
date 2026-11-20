package com.dermaaline.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Production Rate Limiting Filter to mitigate brute-force authentication,
 * OTP flooding, contact submission spam, and appointment booking abuse.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 15;
    private static final int MAX_SUBMISSION_REQUESTS_PER_MINUTE = 6;
    private static final long ONE_MINUTE_MS = 60_000L;

    // In-memory sliding window bucket tracker: Key = IP + ":" + endpointCategory
    private final Map<String, RequestBucket> clientBuckets = new ConcurrentHashMap<>();

    private static class RequestBucket {
        long windowStart;
        int requestCount;

        RequestBucket(long now) {
            this.windowStart = now;
            this.requestCount = 1;
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
        } else if (path.startsWith("/api/auth/register") || path.startsWith("/api/auth/verify-email") 
                || path.startsWith("/api/auth/send-otp") || path.startsWith("/api/auth/forgot-password")
                || path.startsWith("/api/auth/reset-password") || path.startsWith("/api/auth/verify-otp")
                || path.startsWith("/api/auth/resend-otp")) {
            maxAllowed = MAX_AUTH_REQUESTS_PER_MINUTE;
            bucketCategory = "auth-action";
        } else if (path.startsWith("/api/contact") && "POST".equalsIgnoreCase(method)) {
            maxAllowed = MAX_SUBMISSION_REQUESTS_PER_MINUTE;
            bucketCategory = "contact";
        } else if (path.startsWith("/api/appointments") && "POST".equalsIgnoreCase(method)) {
            maxAllowed = MAX_SUBMISSION_REQUESTS_PER_MINUTE;
            bucketCategory = "appointment";
        }

        if (bucketCategory != null) {
            String bucketKey = ip + ":" + bucketCategory;
            RequestBucket bucket = clientBuckets.computeIfAbsent(bucketKey, k -> new RequestBucket(now));

            if (!bucket.allowRequest(maxAllowed, now)) {
                logger.warn("Rate limit exceeded for IP: {} on route: {}", ip, path);
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

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.trim().isEmpty()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
