package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        try {
            if (user.getEmail() == null || user.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is required!"));
            }

            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered!"));
            }

            userRepository.save(user);
            
            // Return success along with a dummy token or message so frontend auth state doesn't break
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Registration successful!",
                "token", "mock-jwt-token-for-registration"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}