package com.dermaaline.backend.security;

import com.dermaaline.backend.service.RateLimitService;
import derma_aline.BackendApplication;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@SpringBootTest(classes = BackendApplication.class)
@ActiveProfiles("test")
public class RateLimitingPersistenceIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void clearBuckets() {
        jdbcTemplate.execute("DELETE FROM rate_limit_buckets");
    }

    @Test
    void testDatabaseBackedRateLimitsPersistAcrossFilterRestartAndInstances() throws Exception {
        // Two completely separate RateLimitService + RateLimitingFilter instances (no shared memory state)
        RateLimitingFilter instanceOne = new RateLimitingFilter();
        instanceOne.setRateLimitService(new RateLimitService(jdbcTemplate, transactionManager));

        RateLimitingFilter instanceTwoAfterRestart = new RateLimitingFilter();
        instanceTwoAfterRestart.setRateLimitService(new RateLimitService(jdbcTemplate, transactionManager));

        FilterChain chain = mock(FilterChain.class);

        for (int i = 1; i <= 6; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
            req.setRemoteAddr("198.51.100.77");
            MockHttpServletResponse res = new MockHttpServletResponse();
            instanceOne.doFilter(req, res, chain);
            assertEquals(200, res.getStatus(), "Request #" + i + " should pass on first instance");
        }

        // 7th request reaches a new filter instance (simulating restart or second horizontal replica)
        MockHttpServletRequest postRestartReq = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
        postRestartReq.setRemoteAddr("198.51.100.77");
        MockHttpServletResponse postRestartRes = new MockHttpServletResponse();
        instanceTwoAfterRestart.doFilter(postRestartReq, postRestartRes, chain);

        assertEquals(429, postRestartRes.getStatus(),
                "Rate limits stored in PostgreSQL/H2 rate_limit_buckets must persist across restarts and instances");
        verify(chain, times(6)).doFilter(any(), any());
    }
}
