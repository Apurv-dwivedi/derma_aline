package com.dermaaline.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseFixRunner {

    @Bean
    public CommandLineRunner ensurePasswordColumnExists(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Safely add password column to users table if it doesn't exist yet
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);");
            } catch (Exception e) {
                System.out.println("Could not alter table: " + e.getMessage());
            }
        };
    }
}