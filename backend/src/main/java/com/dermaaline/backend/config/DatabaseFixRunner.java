package com.dermaaline.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseFixRunner {

    @Bean
    public CommandLineRunner fixNullPasswords(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Safely update any existing null passwords in users table to prevent startup crash
                jdbcTemplate.execute("UPDATE users SET password = '\\\' WHERE password IS NULL;");
            } catch (Exception e) {
                // Table might not exist yet during first creation, ignore safely
            }
        };
    }
}