package com.dermaaline.backend.controller;

import com.dermaaline.backend.dto.RegisterRequest;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.security.JwtTokenProvider;
import com.dermaaline.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EmailService emailService;

    @Value("${app.frontend.url:https://derma-aline.vercel.app}")
    private String frontendUrl;

    /**
     * Patient / Customer Registration (Public)
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password is required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is already registered"));
        }

        User user = new User();
        user.setEmail(email);
        user.setFullName(request.getFullName() != null && !request.getFullName().trim().isEmpty() 
                ? request.getFullName().trim() : "Patient");
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.CUSTOMER);

        User savedUser = userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Registration successful",
            "email", savedUser.getEmail(),
            "fullName", savedUser.getFullName(),
            "role", savedUser.getRole()
        ));
    }

    /**
     * Public Patient Login (/auth route):
     * Strictly blocks ADMIN and STAFF accounts from logging in through public patient portal.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        String portal = credentials.getOrDefault("portal", "public");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and password are required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password"));
        }

        boolean isInternalAccount = (user.getRole() == User.Role.SUPER_ADMIN || 
                                     user.getRole() == User.Role.STAFF || 
                                     "ADMIN".equalsIgnoreCase(user.getRole().name()));

        // If public portal (/auth), forbid admin and staff
        if ("public".equalsIgnoreCase(portal) && isInternalAccount) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Access Restricted: Staff and Admin accounts must login via the Internal Salon Portal (/admin-login)."
            ));
        }

        // If internal portal (/admin-login), forbid standard patients
        if ("internal".equalsIgnoreCase(portal) && !isInternalAccount) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Access Denied: Patient accounts cannot access internal staff portals."
            ));
        }

        String token = jwtTokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(user.getEmail(), null, Collections.emptyList())
        );

        String roleStr = (user.getRole() == User.Role.SUPER_ADMIN) ? "ADMIN" : user.getRole().name();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Login successful",
            "token", token,
            "role", roleStr,
            "email", user.getEmail(),
            "fullName", user.getFullName()
        ));
    }

    /**
     * Internal Staff & Admin Login (/admin-login route)
     */
    @PostMapping("/internal-login")
    public ResponseEntity<?> internalLogin(@RequestBody Map<String, String> credentials) {
        credentials.put("portal", "internal");
        return login(credentials);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");

        if (email == null || oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "All fields are required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Incorrect old password"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully!"));
    }

    /**
     * Request Password Reset Link:
     * Generates a 1-hour secure reset token and emails it to the user.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            String resetUrl = frontendUrl + "/auth?resetToken=" + token;
            boolean sent = emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetUrl);
            
            if (!sent) {
                return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Unable to send password reset email at this moment. Please check server email settings or contact support."
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Password reset instructions have been sent to your email address. Please check your inbox and spam folder."
        ));
    }

    /**
     * Verify Password Reset Token:
     * Validates if the link token is still active and valid.
     */
    @GetMapping("/verify-reset-token")
    public ResponseEntity<?> verifyResetToken(@RequestParam(value = "token", required = false) String token) {
        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Missing reset token."));
        }

        Optional<User> userOpt = userRepository.findByResetToken(token.trim());
        if (userOpt.isEmpty() || userOpt.get().getResetTokenExpiry() == null || userOpt.get().getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Invalid or expired reset token."));
        }

        return ResponseEntity.ok(Map.of(
            "valid", true,
            "email", userOpt.get().getEmail()
        ));
    }

    /**
     * Complete Password Reset:
     * Sets the new password using the validated token and invalidates the token.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Reset token is required."));
        }
        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password is required."));
        }
        if (newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters long."));
        }

        Optional<User> userOpt = userRepository.findByResetToken(token.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid or expired reset link."));
        }

        User user = userOpt.get();
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password reset link has expired. Please request a new one."));
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Your password has been reset successfully! You can now log in with your new password."
        ));
    }
}
