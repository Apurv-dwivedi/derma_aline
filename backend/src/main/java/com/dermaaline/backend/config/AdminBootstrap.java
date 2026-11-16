package com.dermaaline.backend.config;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {

    @Value("${app.admin.email:apurvdwivedi2205@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:Apurv@2026}")
    private String adminPassword;

    @Value("${app.staff.email:staff@dermaaline.com}")
    private String staffEmail;

    @Value("${app.staff.password:Staff@2026}")
    private String staffPassword;

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Initialize / Synchronize Admin
            try {
                User admin = userRepository.findByEmail(adminEmail).orElse(null);
                String encodedAdminPass = passwordEncoder.encode(adminPassword);
                
                if (admin == null) {
                    admin = new User();
                    admin.setEmail(adminEmail);
                    admin.setFullName("Apurv Dwivedi");
                    admin.setPassword(encodedAdminPass);
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
                    if (!passwordEncoder.matches(adminPassword, admin.getPassword())) {
                        admin.setPassword(encodedAdminPass);
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
                        System.out.println("✅ Admin user verified: " + admin.getEmail());
                    }
                }
            } catch (Throwable t) {
                System.err.println("⚠️ AdminBootstrap notice: " + t.getMessage());
            }

            // 2. Initialize / Synchronize Default Worker/Staff User
            try {
                User staff = userRepository.findByEmail(staffEmail).orElse(null);
                String encodedStaffPass = passwordEncoder.encode(staffPassword);

                if (staff == null) {
                    staff = new User();
                    staff.setEmail(staffEmail);
                    staff.setFullName("Clinic Staff Worker");
                    staff.setPassword(encodedStaffPass);
                    staff.setRole(User.Role.STAFF);
                    userRepository.save(staff);
                    System.out.println("✅ Demo staff worker created successfully: " + staffEmail);
                } else {
                    if (staff.getRole() != User.Role.STAFF) {
                        staff.setRole(User.Role.STAFF);
                        userRepository.save(staff);
                    }
                    System.out.println("✅ Staff worker verified: " + staff.getEmail());
                }
            } catch (Throwable t) {
                System.err.println("⚠️ Staff bootstrap notice: " + t.getMessage());
            }
        };
    }
}
