package com.dermaaline.backend.config;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrap.class);

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Value("${app.staff.email:}")
    private String staffEmail;

    @Value("${app.staff.password:}")
    private String staffPassword;

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Optional Admin Provisioning (Only runs if explicit environment variables are provided)
            if (adminEmail != null && !adminEmail.trim().isEmpty() && 
                adminPassword != null && !adminPassword.trim().isEmpty()) {
                try {
                    String cleanEmail = adminEmail.trim().toLowerCase();
                    User admin = userRepository.findByEmail(cleanEmail).orElse(null);
                    String encodedAdminPass = passwordEncoder.encode(adminPassword.trim());

                    if (admin == null) {
                        admin = new User();
                        admin.setEmail(cleanEmail);
                        admin.setFullName("Clinic Administrator");
                        admin.setPassword(encodedAdminPass);
                        admin.setRole(User.Role.SUPER_ADMIN);
                        userRepository.save(admin);
                        logger.info("Admin user successfully initialized from environment variables: {}", cleanEmail);
                    } else if (!passwordEncoder.matches(adminPassword.trim(), admin.getPassword())) {
                        admin.setPassword(encodedAdminPass);
                        userRepository.save(admin);
                        logger.info("Admin password updated from environment variables for: {}", cleanEmail);
                    }
                } catch (Throwable t) {
                    logger.warn("Admin bootstrap notice: {}", t.getMessage());
                }
            } else {
                logger.info("No ADMIN_EMAIL/ADMIN_PASSWORD environment variables set. Existing database credentials remain active.");
            }

            // 2. Optional Staff Provisioning (Only runs if explicit environment variables are provided)
            if (staffEmail != null && !staffEmail.trim().isEmpty() && 
                staffPassword != null && !staffPassword.trim().isEmpty()) {
                try {
                    String cleanStaffEmail = staffEmail.trim().toLowerCase();
                    User staff = userRepository.findByEmail(cleanStaffEmail).orElse(null);
                    String encodedStaffPass = passwordEncoder.encode(staffPassword.trim());

                    if (staff == null) {
                        staff = new User();
                        staff.setEmail(cleanStaffEmail);
                        staff.setFullName("Salon Staff Worker");
                        staff.setPassword(encodedStaffPass);
                        staff.setRole(User.Role.STAFF);
                        staff.setStatus(User.AccountStatus.ACTIVE);
                        userRepository.save(staff);
                        logger.info("Staff user successfully initialized from configuration: {}", cleanStaffEmail);
                    } else {
                        boolean modified = false;
                        if (!passwordEncoder.matches(staffPassword.trim(), staff.getPassword())) {
                            staff.setPassword(encodedStaffPass);
                            modified = true;
                        }
                        if (staff.getRole() != User.Role.STAFF && staff.getRole() != User.Role.SUPER_ADMIN && staff.getRole() != User.Role.ADMIN) {
                            staff.setRole(User.Role.STAFF);
                            modified = true;
                        }
                        if (staff.getStatus() != User.AccountStatus.ACTIVE) {
                            staff.setStatus(User.AccountStatus.ACTIVE);
                            modified = true;
                        }
                        if (modified) {
                            userRepository.save(staff);
                            logger.info("Staff credentials and active status verified: {}", cleanStaffEmail);
                        }
                    }
                } catch (Throwable t) {
                    logger.warn("Staff bootstrap notice: {}", t.getMessage());
                }
            }
        };
    }
}
