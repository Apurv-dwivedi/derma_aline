package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;

    @GetMapping("/")
    public ResponseEntity<?> rootEndpoint() {
        return ResponseEntity.ok(Map.of(
            "app", "Derma Aline Backend API",
            "status", "Running successfully",
            "version", "1.0.0"
        ));
    }

    @PostMapping("/api/auth/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> payload) {
        try {
            String email = (String) payload.get("email");
            String rawPassword = (String) payload.get("password");
            
            String fullName = (String) payload.get("full_name");
            if (fullName == null) fullName = (String) payload.get("fullName");
            if (fullName == null) fullName = (String) payload.get("name");
            if (fullName == null) fullName = "Valued Patient";

            String phone = (String) payload.get("phone");
            if (phone == null || phone.isEmpty()) {
                phone = "0000000000";
            }

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is required!"));
            }

            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered!"));
            }

            User user = new User();
            user.setEmail(email);

            // Hash password securely if encoder is available
            String encodedPassword = (passwordEncoder != null && rawPassword != null) ? passwordEncoder.encode(rawPassword) : rawPassword;

            setFieldSafely(user, new String[]{"setFullName", "setName"}, fullName);
            setFieldSafely(user, new String[]{"setPassword", "setPasswordHash", "setPass"}, encodedPassword);
            setFieldSafely(user, new String[]{"setPhone", "setMobile", "setPhoneNumber"}, phone);
            setBooleanFieldSafely(user, new String[]{"setEnabled", "setActive"}, true);

            // Assign default role safely
            for (Method method : user.getClass().getMethods()) {
                if (method.getName().equals("setRole") && method.getParameterCount() == 1) {
                    Class<?> paramType = method.getParameterTypes()[0];
                    try {
                        if (paramType.isEnum()) {
                            Object enumVal = null;
                            for (Object constant : paramType.getEnumConstants()) {
                                if (constant.toString().equalsIgnoreCase("USER") || constant.toString().equalsIgnoreCase("ROLE_USER")) {
                                    enumVal = constant;
                                    break;
                                }
                            }
                            if (enumVal == null && paramType.getEnumConstants().length > 0) {
                                enumVal = paramType.getEnumConstants()[0];
                            }
                            method.invoke(user, enumVal);
                            break;
                        } else if (paramType.equals(String.class)) {
                            method.invoke(user, "USER");
                            break;
                        }
                    } catch (Exception ignored) {}
                }
            }

            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Registration successful!",
                "token", "mock-jwt-token-registration"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, Object> payload) {
        try {
            String email = (String) payload.get("email");
            String password = (String) payload.get("password");

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is required!"));
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password"));
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Login successful",
                "token", "mock-jwt-token-login",
                "user", Map.of("email", email)
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private void setFieldSafely(Object target, String[] methodNames, String value) {
        for (String methodName : methodNames) {
            try {
                Method method = target.getClass().getMethod(methodName, String.class);
                method.invoke(target, value);
                return;
            } catch (Exception ignored) {}
        }
    }

    private void setBooleanFieldSafely(Object target, String[] methodNames, boolean value) {
        for (String methodName : methodNames) {
            try {
                Method method = target.getClass().getMethod(methodName, boolean.class);
                method.invoke(target, value);
                return;
            } catch (Exception ignored) {}
        }
    }
}