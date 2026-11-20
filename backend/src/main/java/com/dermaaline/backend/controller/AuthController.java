package com.dermaaline.backend.controller;

import com.dermaaline.backend.dto.RegisterRequest;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.security.JwtTokenProvider;
import com.dermaaline.backend.service.EmailService;
import com.dermaaline.backend.service.OtpService;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private StaffInvitationRepository staffInvitationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OtpService otpService;

    @Autowired
    private com.dermaaline.backend.service.AuditLogService auditLogService;

    @Value("${app.frontend.url:https://derma-aline.vercel.app}")
    private String frontendUrl;

    /**
     * Customer Self-Registration
     * Direct instant registration: creates ACTIVE customer, issues JWT, and grants direct portal access.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters long."));
        }

        String email = SecuritySanitizer.sanitizeEmail(request.getEmail());
        if (email == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address is required."));
        }
        String fullName = SecuritySanitizer.sanitizeText(request.getFullName(), 100);
        if (fullName == null || fullName.isEmpty()) {
            fullName = "Valued Client";
        }
        String phone = SecuritySanitizer.sanitizePhone(request.getPhone());

        Optional<User> existingUserOpt = userRepository.findByEmail(email);

        User user;
        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            if (existing.getStatus() == User.AccountStatus.ACTIVE) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false, 
                    "message", "This email address is already registered. Please sign in."
                ));
            }
            existing.setFullName(fullName);
            existing.setPhone(phone);
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
            existing.setRole(User.Role.CUSTOMER);
            existing.setStatus(User.AccountStatus.PENDING_VERIFICATION);
            user = userRepository.save(existing);
        } else {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(fullName);
            newUser.setPhone(phone);
            newUser.setPassword(passwordEncoder.encode(request.getPassword()));
            newUser.setRole(User.Role.CUSTOMER);
            newUser.setStatus(User.AccountStatus.PENDING_VERIFICATION);
            user = userRepository.save(newUser);
        }

        // Generate and dispatch 6-digit OTP verification code via Brevo
        try {
            otpService.generateAndSendOtp(email, fullName);
        } catch (Exception e) {
            // Log notice, still allow user to enter verification mode and request resend if needed
            System.err.println("OTP dispatch notice for " + email + ": " + e.getMessage());
        }

        auditLogService.record("REGISTER_PENDING_OTP", email, user.getRole().name(), "USER", user.getId() != null ? user.getId().toString() : "N/A", "Client registered; awaiting 6-digit OTP email verification");

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("requiresVerification", true);
        resp.put("email", user.getEmail());
        resp.put("message", "A 6-digit verification code has been dispatched to " + user.getEmail() + ". Please enter the code below to complete your registration.");

        return ResponseEntity.ok(resp);
    }

    /**
     * Customer Email Verification: Step 2
     * Verifies the 6-digit OTP, sets status to ACTIVE, creates/links Customer profile, and issues JWT.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");

        if (email == null || otp == null || email.trim().isEmpty() || otp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and verification code are required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        boolean valid = otpService.verifyOtp(cleanEmail, otp.trim());

        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, 
                "message", "Invalid or expired verification code. Please check and try again."
            ));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User account not found."));
        }

        User user = userOpt.get();
        user.setStatus(User.AccountStatus.ACTIVE);
        userRepository.save(user);

        // Safe Customer Profile Linking: Ensure a matching Customer entity exists
        Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
        if (customerOpt.isEmpty()) {
            Customer c = new Customer();
            c.setEmail(cleanEmail);
            c.setFullName(user.getFullName());
            c.setPhone(user.getPhone());
            customerRepository.save(c);
        }

        // Generate JWT Token
        String token = jwtTokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(user.getEmail(), null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Email verified successfully! Welcome to Derma Aline Aesthétics.",
            "token", token,
            "role", "CUSTOMER",
            "email", user.getEmail(),
            "fullName", user.getFullName()
        ));
    }

    /**
     * Resend Email OTP
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Account not found."));
        }

        User user = userOpt.get();
        if (user.getStatus() == User.AccountStatus.ACTIVE) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Account is already verified. Please sign in."));
        }

        try {
            boolean sent = otpService.generateAndSendOtp(cleanEmail, user.getFullName());
            if (!sent) {
                String errorDetail = emailService.getLastError() != null ? emailService.getLastError() : "Cloud firewall blocked SMTP port 587";
                return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Verification email could not be delivered: " + errorDetail
                ));
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A new verification code has been dispatched to your email address."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to dispatch verification email."));
        }
    }

    /**
     * Supabase User Synchronization (Google SSO & Email OTP Verified)
     * Securely links or provisions active customer record, links customer profile, and issues application JWT.
     */
    @PostMapping("/sync-supabase-user")
    public ResponseEntity<?> syncSupabaseUser(@RequestBody Map<String, String> payload) {
        if (payload == null || payload.get("email") == null || payload.get("email").trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }

        String email = SecuritySanitizer.sanitizeEmail(payload.get("email"));
        if (email == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address is required."));
        }

        String rawFullName = payload.get("fullName");
        String fullName = SecuritySanitizer.sanitizeText(rawFullName, 100);
        if (fullName == null || fullName.trim().isEmpty()) {
            fullName = "Valued Client";
        }

        String phone = SecuritySanitizer.sanitizePhone(payload.get("phone"));
        String provider = SecuritySanitizer.sanitizeText(payload.getOrDefault("provider", "supabase"), 50);

        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getStatus() == User.AccountStatus.DISABLED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Your account has been deactivated. Please contact clinic management."
                ));
            }
            // Supabase verified the email: activate account
            user.setStatus(User.AccountStatus.ACTIVE);
            if (phone != null && !phone.isEmpty() && (user.getPhone() == null || user.getPhone().isEmpty())) {
                user.setPhone(phone);
            }
            if (fullName != null && !fullName.equals("Valued Client") && (user.getFullName() == null || user.getFullName().equals("Valued Client"))) {
                user.setFullName(fullName);
            }
            user = userRepository.save(user);
        } else {
            user = new User();
            user.setEmail(email);
            user.setFullName(fullName);
            user.setPhone(phone);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setRole(User.Role.CUSTOMER);
            user.setStatus(User.AccountStatus.ACTIVE);
            user = userRepository.save(user);
        }

        // Safe Customer Profile Linking
        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isEmpty()) {
            Customer c = new Customer();
            c.setEmail(email);
            c.setFullName(user.getFullName());
            c.setPhone(user.getPhone());
            customerRepository.save(c);
        }

        String roleStr = (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN) 
                ? "ADMIN" : user.getRole().name();

        String token = jwtTokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(user.getEmail(), null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleStr)))
        );

        auditLogService.record("SUPABASE_AUTH_SYNC", user.getEmail(), roleStr, "USER", user.getId() != null ? user.getId().toString() : "N/A", 
            "Authenticated and synchronized via Supabase (" + provider + ")");

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("token", token);
        resp.put("role", roleStr);
        resp.put("email", user.getEmail());
        resp.put("fullName", user.getFullName());
        resp.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");
        resp.put("message", "Welcome to Derma Aline Aesthétics.");

        return ResponseEntity.ok(resp);
    }

    /**
     * Synchronize Password with Supabase Reset
     */
    @PostMapping("/sync-password")
    public ResponseEntity<?> syncPassword(@RequestBody Map<String, String> payload) {
        if (payload == null || payload.get("email") == null || payload.get("newPassword") == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and new password are required."));
        }

        String cleanEmail = payload.get("email").trim().toLowerCase();
        String newPassword = payload.get("newPassword").trim();

        if (cleanEmail.isEmpty() || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid email and new password (min 6 characters) are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User account not found."));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        auditLogService.record("PASSWORD_RESET_SYNC", cleanEmail, user.getRole().name(), "USER", user.getId() != null ? user.getId().toString() : "N/A", "Password reset updated via Supabase");

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Password successfully updated in clinic database."
        ));
    }

    /**
     * Client / Customer Portal Login
     * Strictly verifies role is CUSTOMER and account is ACTIVE.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        String portal = credentials.getOrDefault("portal", "client");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and password are required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password."));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            auditLogService.record("LOGIN_FAILED", cleanEmail, user.getRole().name(), "USER", user.getId() != null ? user.getId().toString() : "N/A", "Failed authentication: invalid password attempt");
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password."));
        }

        // Account status check: require 6-digit OTP email verification
        if (user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            try {
                otpService.generateAndSendOtp(cleanEmail, user.getFullName());
            } catch (Exception ignored) {}
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "requiresVerification", true,
                "email", cleanEmail,
                "message", "Your email address is pending verification. A fresh 6-digit verification code has been dispatched to your email."
            ));
        }

        if (user.getStatus() == User.AccountStatus.DISABLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Your account has been deactivated. Please contact clinic management."
            ));
        }

        boolean isInternalAccount = (user.getRole() == User.Role.SUPER_ADMIN || 
                                     user.getRole() == User.Role.ADMIN || 
                                     user.getRole() == User.Role.STAFF);

        // Client portal login: blocks internal accounts
        if (("client".equalsIgnoreCase(portal) || "public".equalsIgnoreCase(portal)) && isInternalAccount) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Access Restricted: Staff and Clinic Administrators must sign in through the Salon Portal (/admin-login)."
            ));
        }

        // Internal portal login: blocks customer accounts
        if ("internal".equalsIgnoreCase(portal) && !isInternalAccount) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Access Denied: Client accounts cannot access internal staff or administration portals."
            ));
        }

        String roleStr = (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN) 
                ? "ADMIN" : user.getRole().name();

        String token = jwtTokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(user.getEmail(), null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleStr)))
        );

        Map<String, Object> respMap = new HashMap<>();
        respMap.put("success", true);
        respMap.put("message", "Welcome back to Derma Aline Aesthétics.");
        respMap.put("token", token);
        respMap.put("role", roleStr);
        respMap.put("email", user.getEmail());
        respMap.put("fullName", user.getFullName());
        respMap.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");

        auditLogService.record("LOGIN_SUCCESS", user.getEmail(), roleStr, "USER", user.getId() != null ? user.getId().toString() : "N/A", "Authenticated into portal mode: " + portal);

        return ResponseEntity.ok(respMap);
    }

    /**
     * Internal Staff & Admin Login
     */
    @PostMapping("/internal-login")
    public ResponseEntity<?> internalLogin(@RequestBody Map<String, String> credentials) {
        credentials.put("portal", "internal");
        return login(credentials);
    }

    /**
     * Staff Activation via Single-Use Invite Token
     */
    @PostMapping("/staff/activate")
    public ResponseEntity<?> activateStaff(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String password = payload.get("password");
        String fullName = payload.get("fullName");

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invitation token is required."));
        }
        if (password == null || password.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters long."));
        }

        Optional<StaffInvitation> inviteOpt = staffInvitationRepository.findByToken(token.trim());
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid invitation token."));
        }

        StaffInvitation invitation = inviteOpt.get();
        if (invitation.getStatus() != StaffInvitation.InvitationStatus.INVITED) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "This staff invitation has already been used or revoked."));
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(StaffInvitation.InvitationStatus.EXPIRED);
            staffInvitationRepository.save(invitation);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invitation link has expired. Please contact the clinic owner."));
        }

        String cleanEmail = invitation.getEmail().trim().toLowerCase();
        User staffUser = userRepository.findByEmail(cleanEmail).orElseGet(User::new);
        staffUser.setEmail(cleanEmail);
        staffUser.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : invitation.getFullName());
        staffUser.setPassword(passwordEncoder.encode(password.trim()));
        staffUser.setRole(User.Role.STAFF);
        staffUser.setStatus(User.AccountStatus.ACTIVE);
        userRepository.save(staffUser);

        invitation.setStatus(StaffInvitation.InvitationStatus.ACTIVE);
        staffInvitationRepository.save(invitation);

        String jwtToken = jwtTokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(staffUser.getEmail(), null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_STAFF")))
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Staff account successfully activated! Welcome to the Derma Aline clinical team.",
            "token", jwtToken,
            "role", "STAFF",
            "email", staffUser.getEmail(),
            "fullName", staffUser.getFullName()
        ));
    }

    /**
     * Password Reset Request:
     * Generates a 1-hour secure reset token and emails it.
     * NEVER returns reset tokens or links in the API response.
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
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetUrl);
        }

        // Generic constant response prevents email enumeration and token leakage
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "If an account with that email address exists in our system, password reset instructions have been sent to your inbox."
        ));
    }

    /**
     * Verify Password Reset Token
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
     * Complete Password Reset
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Reset token is required."));
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
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

    /**
     * Authenticated Password Change
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");

        if (email == null || oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "All fields are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Incorrect current password."));
        }

        if (newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be at least 6 characters."));
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully."));
    }
}
