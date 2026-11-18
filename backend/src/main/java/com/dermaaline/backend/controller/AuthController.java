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
@CrossOrigin(origins = "*")
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
     * Customer Self-Registration: Step 1
     * Creates PENDING_VERIFICATION user and dispatches 6-digit OTP to customer's email.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters long."));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> existingUserOpt = userRepository.findByEmail(email);

        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            if (existing.getStatus() == User.AccountStatus.ACTIVE) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false, 
                    "message", "This email address is already registered. Please sign in."
                ));
            }
            // If user exists but is still pending verification, update info and re-issue OTP
            existing.setFullName(request.getFullName() != null && !request.getFullName().trim().isEmpty() 
                    ? request.getFullName().trim() : "Valued Client");
            existing.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
            existing.setRole(User.Role.CUSTOMER);
            userRepository.save(existing);
        } else {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(request.getFullName() != null && !request.getFullName().trim().isEmpty() 
                    ? request.getFullName().trim() : "Valued Client");
            newUser.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
            newUser.setPassword(passwordEncoder.encode(request.getPassword()));
            newUser.setRole(User.Role.CUSTOMER);
            newUser.setStatus(User.AccountStatus.PENDING_VERIFICATION);
            userRepository.save(newUser);
        }

        try {
            boolean sent = otpService.generateAndSendOtp(email, request.getFullName());
            if (!sent) {
                String errorDetail = emailService.getLastError() != null ? emailService.getLastError() : "Cloud firewall blocked SMTP port 587";
                return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "email", email,
                    "message", "Registration saved, but verification email could not be delivered: " + errorDetail
                ));
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "requiresVerification", true,
                "email", email,
                "message", "A 6-digit verification code has been sent to your email. Please enter it to activate your account."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false, 
                "message", "Registration initiated, but failed to send verification email. Please try resending the OTP."
            ));
        }
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
            auditLogService.record("LOGIN_FAILED", cleanEmail, user.getRole().name(), "USER", user.getId().toString(), "Failed authentication: invalid password attempt");
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid email or password."));
        }

        // Account status check
        if (user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "requiresVerification", true,
                "email", user.getEmail(),
                "message", "Your email address has not been verified yet. Please enter the OTP sent to your inbox."
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

        auditLogService.record("LOGIN_SUCCESS", user.getEmail(), roleStr, "USER", user.getId().toString(), "Authenticated into portal mode: " + portal);

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
