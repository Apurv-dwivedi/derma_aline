package com.dermaaline.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsGlobalConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow all Vercel preview and main URLs
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*");
        
        // Allow all Headers and Methods (GET, POST, OPTIONS, etc.)
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        
        // Apply this rule to all API endpoints
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}