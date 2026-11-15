package com.dermaaline.backend.service;
import com.dermaaline.backend.entity.Role;
import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository userRepository;
    private final TreatmentRepository treatmentRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrap(UserRepository userRepository, TreatmentRepository treatmentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.treatmentRepository = treatmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Seed Admin
        if (!userRepository.existsByEmail("admin@dermaaline.com")) {
            User admin = new User();
            admin.setFullName("System Administrator");
            admin.setEmail("admin@dermaaline.com");
            admin.setPasswordHash(passwordEncoder.encode("admin123")); 
            admin.setPhone("9999999999");
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            System.out.println("Bootstrap: Default admin account created successfully.");
        }

        // Seed Default Treatments if Database is empty
        if (treatmentRepository.count() == 0) {
            List<String> defaultTreatments = List.of(
                "Acne Treatment", "Laser Hair Reduction", "Anti-Aging Fillers", 
                "Chemical Peels", "Skin Brightening", "Hydrafacial"
            );
            
            for (String tName : defaultTreatments) {
                Treatment t = new Treatment();
                t.setName(tName);
                t.setDurationMinutes(30);
                t.setActive(true);
                treatmentRepository.save(t);
            }
            System.out.println("Bootstrap: Default treatments populated.");
        }
    }
}