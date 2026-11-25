package com.dermaaline.backend.config;

import com.dermaaline.backend.security.JwtAuthenticationFilter;
import com.dermaaline.backend.security.RateLimitingFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @Value("${app.cors.allowed-origins:https://derma-aline.vercel.app,http://localhost:3000,http://localhost:5173}")
    private String allowedOriginsConfig;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(content -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            )
            .authorizeHttpRequests(auth -> auth
                // Allow browser preflight OPTIONS
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Require valid JWT authentication before attempting password change or logout
                .requestMatchers("/api/auth/logout", "/api/auth/change-password").authenticated()

                // Public Authentication, Registration & Verification
                .requestMatchers("/api/auth/**").permitAll()

                // Public informational endpoints & submissions (read-only treatments, contact, appointment booking, availability)
                .requestMatchers(HttpMethod.GET, "/api/treatments/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/appointments/availability").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/appointments").permitAll()
                .requestMatchers("/api/health/**", "/health", "/error").permitAll()

                // Owner-only Treatment Catalogue modifications
                .requestMatchers(HttpMethod.POST, "/api/treatments/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/treatments/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/treatments/**").hasAnyRole("SUPER_ADMIN", "ADMIN")

                // Client / Customer Portal APIs (Protected, validated via authenticated principal)
                .requestMatchers("/api/client/**").hasAnyRole("CUSTOMER", "PATIENT", "SUPER_ADMIN", "ADMIN")

                // Staff Operational Portal APIs
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")

                // Enquiries & Customer CRM access (Destructive deletes restricted to Admin; read/update allowed for Staff/Admin)
                .requestMatchers(HttpMethod.DELETE, "/api/contact/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .requestMatchers("/api/contact/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/customers/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .requestMatchers("/api/customers/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")

                // Owner / Super Admin APIs (Executive suite, staff management, settings, audit logs)
                .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")

                // Protected Appointment Management
                .requestMatchers("/api/appointments/my").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/appointments/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                .requestMatchers("/api/appointments/**").hasAnyRole("STAFF", "SUPER_ADMIN", "ADMIN")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        List<String> origins = Arrays.stream((allowedOriginsConfig != null ? allowedOriginsConfig : "https://derma-aline.vercel.app").split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        config.setExposedHeaders(Arrays.asList("Authorization"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
