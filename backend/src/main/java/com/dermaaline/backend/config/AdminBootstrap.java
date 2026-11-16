package com.dermaaline.backend.config;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String adminEmail = "apurvdwivedi2205@gmail.com";
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            
            String encodedPassword = passwordEncoder.encode("Apurv@2026");
            
            if (admin == null) {
                admin = new User();
                admin.setEmail(adminEmail);
                admin.setFullName("Apurv Dwivedi");
                admin.setPassword(encodedPassword);
                admin.setEnabled(true); // Fix not-null constraint on enabled column
                try {
                    admin.setRole(User.Role.valueOf("ADMIN"));
                } catch (Exception e) {
                    admin.setRole(User.Role.valueOf("STAFF"));
                }
                userRepository.save(admin);
                System.out.println("✅ Admin user created successfully with enabled=true!");
            } else {
                admin.setPassword(encodedPassword);
                admin.setEnabled(true); // Ensure enabled is not null
                userRepository.save(admin);
                System.out.println("✅ Admin password reset and enabled status synchronized!");
            }
        };
    }
}