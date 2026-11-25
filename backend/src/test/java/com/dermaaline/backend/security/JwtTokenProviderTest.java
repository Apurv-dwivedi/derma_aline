package com.dermaaline.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

public class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        // Inject synthetic unit-test-only key (never a real or production secret)
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", "SyntheticUnitTestSigningKeyForJUnitValidation1234567890");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationDate", 86400000L); // 1 day
        jwtTokenProvider.init();
    }

    @Test
    public void testGenerateAndValidateToken() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("patient@test.com", "password", Collections.emptyList());
        
        String token = jwtTokenProvider.generateToken(authentication);
        
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("patient@test.com", jwtTokenProvider.getUsername(token));
    }

    @Test
    public void testInvalidTokenRejection() {
        String invalidToken = "eyJhbGciOiJIUzI1NiJ9.InvalidPayload.Signature";
        assertFalse(jwtTokenProvider.validateToken(invalidToken));
    }
}