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
                // Safely alter users table to give 'enabled' column a default value of true if it causes constraint issues
                jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN enabled SET DEFAULT TRUE;");
            } catch (Exception e) {
                // Ignore if column doesn't exist or already has default
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
                    admin.setRole(User.Role.valueOf("ADMIN"));
                } catch (Exception e) {
                    admin.setRole(User.Role.valueOf("STAFF"));
                }
                userRepository.save(admin);
                System.out.println("✅ Admin user created successfully!");
            } else {
                admin.setPassword(encodedPassword);
                userRepository.save(admin);
                System.out.println("✅ Admin password reset successfully!");
            }
        };
    }
}