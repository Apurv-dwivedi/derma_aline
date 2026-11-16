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
            try {
                String adminEmail = "apurvdwivedi2205@gmail.com";
                User admin = userRepository.findByEmail(adminEmail).orElse(null);
                
                String rawPassword = "Apurv@2026";
                String encodedPassword = passwordEncoder.encode(rawPassword);
                
                if (admin == null) {
                    admin = new User();
                    admin.setEmail(adminEmail);
                    admin.setFullName("Apurv Dwivedi");
                    admin.setPassword(encodedPassword);
                    try {
                        admin.setRole(User.Role.valueOf("SUPER_ADMIN"));
                    } catch (Exception e) {
                        try {
                            admin.setRole(User.Role.valueOf("ADMIN"));
                        } catch (Exception ex) {
                            admin.setRole(User.Role.STAFF);
                        }
                    }
                    userRepository.save(admin);
                    System.out.println("✅ Admin user created successfully!");
                } else {
                    boolean needsSave = false;
                    if (!passwordEncoder.matches(rawPassword, admin.getPassword())) {
                        admin.setPassword(encodedPassword);
                        needsSave = true;
                    }
                    if (admin.getRole() == null || !admin.getRole().name().equals("SUPER_ADMIN")) {
                        try {
                            admin.setRole(User.Role.valueOf("SUPER_ADMIN"));
                            needsSave = true;
                        } catch (Exception ignored) {}
                    }
                    if (needsSave) {
                        userRepository.save(admin);
                        System.out.println("✅ Admin password reset and role synchronized!");
                    } else {
                        System.out.println("✅ Admin user already verified: " + admin.getEmail());
                    }
                }
            } catch (Throwable t) {
                System.err.println("⚠️ AdminBootstrap notice: " + t.getMessage());
            }
        };
    }
}
