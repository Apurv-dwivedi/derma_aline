package com.dermaaline.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

public class RateLimitingFilterTest {

    @Test
    void testOtpAndBookingRateLimitCannotBeBypassedBySpoofedXForwardedForFromLocalPeer() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();
        FilterChain chain = mock(FilterChain.class);

        // Send 6 valid OTP requests spoofing a different X-Forwarded-For each time from local socket 127.0.0.1
        for (int i = 1; i <= 6; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
            req.setRemoteAddr("127.0.0.1");
            req.addHeader("X-Forwarded-For", "198.51.100." + i);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertEquals(200, res.getStatus(), "Request #" + i + " should be permitted within per-minute OTP threshold");
        }

        // 7th request with another spoofed IP must still hit HTTP 429
        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
        blockedReq.setRemoteAddr("127.0.0.1");
        blockedReq.addHeader("X-Forwarded-For", "203.0.113.99");
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        filter.doFilter(blockedReq, blockedRes, chain);

        assertEquals(429, blockedRes.getStatus(), "Spoofed X-Forwarded-For must not bypass OTP rate limit");
        verify(chain, times(6)).doFilter(any(), any());
    }

    @Test
    void testProxyRightmostNonInternalHopRateLimitingPreventsSpoofBypass() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();
        FilterChain chain = mock(FilterChain.class);

        for (int i = 1; i <= 6; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/appointments");
            req.setRemoteAddr("10.0.1.25");
            // Attacker spoofs left-hand hop while Render ingress appends real client IP 198.51.100.42
            req.addHeader("X-Forwarded-For", "1.1.1." + i + ", 198.51.100.42");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertEquals(200, res.getStatus());
        }

        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/appointments");
        blockedReq.setRemoteAddr("10.0.1.25");
        blockedReq.addHeader("X-Forwarded-For", "9.9.9.9, 198.51.100.42");
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        filter.doFilter(blockedReq, blockedRes, chain);

        assertEquals(429, blockedRes.getStatus(), "Spoofing leading X-Forwarded-For behind proxy must not bypass limit");
    }
}
