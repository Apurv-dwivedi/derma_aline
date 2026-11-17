package com.dermaaline.backend.config;

import com.dermaaline.backend.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .cors(cors -> {})
            .authorizeHttpRequests(auth -> auth
                // Allow browser preflight OPTIONS
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public Authentication, Registration & Verification
                .requestMatchers("/api/auth/**").permitAll()

                // Public informational endpoints
                .requestMatchers(HttpMethod.GET, "/api/treatments/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/contact/**").permitAll()
                .requestMatchers("/api/health/**", "/health", "/error").permitAll()

                // Client / Customer Portal APIs (Protected, validated via authenticated principal)
                .requestMatchers("/api/client/**").hasAnyRole("CUSTOMER", "PATIENT", "SUPER_ADMIN", "ADMIN")

                // Staff Operational Portal APIs
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")

                // Owner / Super Admin APIs
                .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")

                // Historical appointments fallback during migration
                .requestMatchers("/api/appointments/my").authenticated()
                .requestMatchers("/api/appointments/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(Arrays.asList(
            "https://derma-aline.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173"
        ));
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
