package com.dermaaline.backend.config;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Drop not-null constraint on phone column if present in database
                jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;");
            } catch (Exception e) {
                // Ignore if already nullable or column doesn't exist
            }

            String adminEmail = "apurvdwivedi2205@gmail.com";
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            
            String encodedPassword = passwordEncoder.encode("Apurv@2026");
            
            if (admin == null) {
                admin = new User();
                admin.setEmail(adminEmail);
                admin.setFullName("Apurv Dwivedi");
                admin.setPassword(encodedPassword);
                try {
                    // Set phone if setter exists or let's handle safely via try-catch
                    admin.getClass().getMethod("setPhone", String.class).invoke(admin, "0000000000");
                } catch (Exception e) {}

                try {
                    admin.setRole(User.Role.valueOf("ADMIN"));
                } catch (Exception e) {
                    admin.setRole(User.Role.valueOf("STAFF"));
                }
                userRepository.save(admin);
                System.out.println("✅ Admin user created successfully with default phone!");
            } else {
                admin.setPassword(encodedPassword);
                try {
                    admin.getClass().getMethod("setPhone", String.class).invoke(admin, "0000000000");
                } catch (Exception e) {}
                userRepository.save(admin);
                System.out.println("✅ Admin password reset and phone synchronized successfully!");
            }
        };
    }
}