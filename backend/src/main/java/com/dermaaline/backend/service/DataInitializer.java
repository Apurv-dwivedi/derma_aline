package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        String ownerEmail = "apurvdwivedi2205@gmail.com";
        
        if (userRepository.findByEmail(ownerEmail).isEmpty()) {
            User owner = new User();
            owner.setFullName("Apurv Dwivedi");
            owner.setEmail(ownerEmail);
            owner.setPassword(passwordEncoder.encode("Apurv@2026")); // Initial secure password set by owner
            owner.setRole(User.Role.SUPER_ADMIN);
            
            userRepository.save(owner);
            System.out.println("✅ Primary Owner account initialized successfully for: " + ownerEmail);
        }
    }
}