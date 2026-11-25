package com.dermaaline.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final String TOKEN_VERSION_CLAIM = "tv";

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-milliseconds:86400000}")
    private long jwtExpirationDate;

    @Value("${app.jwt.allow-ephemeral-fallback:false}")
    private boolean allowEphemeralFallback;

    private Key signingKey;

    @PostConstruct
    public void init() {
        if (jwtSecret != null && jwtSecret.trim().length() >= 32) {
            this.signingKey = Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8));
            logger.info("Cryptographic JWT Token Provider initialized using injected secure environment key.");
        } else if (allowEphemeralFallback) {
            logger.warn("WARNING: Using ephemeral HS256 JWT signing key because app.jwt.allow-ephemeral-fallback=true.");
            this.signingKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        } else {
            throw new IllegalStateException("JWT_SECRET environment variable must be configured with at least 32 characters.");
        }
    }

    private Key key() {
        return this.signingKey;
    }

    public String generateToken(Authentication authentication) {
        return generateToken(authentication, 0L);
    }

    public String generateToken(Authentication authentication, long tokenVersion) {
        String username = authentication.getName();
        Date currentDate = new Date();
        Date expireDate = new Date(currentDate.getTime() + jwtExpirationDate);

        return Jwts.builder()
                .setSubject(username)
                .claim(TOKEN_VERSION_CLAIM, tokenVersion)
                .setIssuedAt(currentDate)
                .setExpiration(expireDate)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody().getSubject();
    }

    public long getTokenVersion(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
        Number tv = claims.get(TOKEN_VERSION_CLAIM, Number.class);
        return tv != null ? tv.longValue() : 0L;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
