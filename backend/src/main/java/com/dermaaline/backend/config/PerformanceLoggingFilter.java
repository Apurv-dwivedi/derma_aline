package com.dermaaline.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PerformanceLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        long startTime = System.currentTimeMillis();
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            String path = httpRequest.getRequestURI();
            String method = httpRequest.getMethod();
            int status = httpResponse.getStatus();

            // Set latency in response header for client-side timing analysis
            httpResponse.setHeader("X-Response-Time-Millis", String.valueOf(duration));

            // Log API performance and latency
            if (path.startsWith("/api")) {
                logger.info("[PERFORMANCE] {} {} - Status: {} - Latency: {}ms", method, path, status, duration);
            }
        }
    }
}
