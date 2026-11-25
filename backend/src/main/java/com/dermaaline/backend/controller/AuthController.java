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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

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

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.anon-key:}")
    private String supabaseAnonKey;

    @Value("${app.supabase.jwt-secret:}")
    private String supabaseJwtSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
     * Cryptographically verifies the Supabase session token before provisioning or authenticating a CUSTOMER account.
     * Never trusts unverified client-supplied email claims and never issues ADMIN or STAFF tokens.
     */
    @PostMapping("/sync-supabase-user")
    public ResponseEntity<?> syncSupabaseUser(@RequestBody(required = false) Map<String, String> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request payload is required."));
        }

        String accessToken = payload.get("accessToken");
        if (accessToken == null || accessToken.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "success", false,
                "message", "Verified Supabase session token is required."
            ));
        }

        boolean hasApiConfig = supabaseUrl != null && !supabaseUrl.trim().isEmpty()
                && supabaseAnonKey != null && !supabaseAnonKey.trim().isEmpty();
        boolean hasJwtConfig = supabaseJwtSecret != null && !supabaseJwtSecret.trim().isEmpty();

        if (!hasApiConfig && !hasJwtConfig) {
            logger.warn("Supabase user sync rejected: SUPABASE_JWT_SECRET or SUPABASE_URL/SUPABASE_ANON_KEY is not configured.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "success", false,
                "message", "Supabase SSO verification is not configured on the server."
            ));
        }

        String email = verifySupabaseTokenAndExtractEmail(accessToken.trim(), hasApiConfig, hasJwtConfig);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "success", false,
                "message", "Invalid or expired Supabase session token."
            ));
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
            if (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.STAFF) {
                auditLogService.record("SUPABASE_SSO_BLOCKED", user.getEmail(), user.getRole().name(), "USER",
                        user.getId() != null ? user.getId().toString() : "N/A",
                        "Blocked SSO login attempt for internal privileged account");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Access Restricted: Staff and Clinic Administrators must sign in through the internal portal."
                ));
            }
            if (user.getStatus() == User.AccountStatus.DISABLED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Your account has been deactivated. Please contact clinic management."
                ));
            }
            // Supabase verified the email: activate customer account
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

        String roleStr = user.getRole() == User.Role.PATIENT ? "PATIENT" : "CUSTOMER";

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

    private String verifySupabaseTokenAndExtractEmail(String accessToken, boolean hasApiConfig, boolean hasJwtConfig) {
        if (hasJwtConfig) {
            String trimmedSecret = supabaseJwtSecret.trim();
            String email = parseSupabaseJwtEmail(accessToken, trimmedSecret.getBytes(StandardCharsets.UTF_8));
            if (email != null) {
                return email;
            }
            try {
                byte[] decoded = Base64.getDecoder().decode(trimmedSecret);
                email = parseSupabaseJwtEmail(accessToken, decoded);
                if (email != null) {
                    return email;
                }
            } catch (IllegalArgumentException ignored) {}
        }

        if (hasApiConfig) {
            try {
                String baseUrl = supabaseUrl.trim().replaceAll("/+$", "");
                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .build();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/auth/v1/user"))
                        .timeout(Duration.ofSeconds(6))
                        .header("Authorization", "Bearer " + accessToken)
                        .header("apikey", supabaseAnonKey.trim())
                        .GET()
                        .build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    String verifiedEmail = root.path("email").asText("");
                    String userId = root.path("id").asText("");
                    if (!userId.isEmpty() && !verifiedEmail.isEmpty()) {
                        return SecuritySanitizer.sanitizeEmail(verifiedEmail);
                    }
                }
            } catch (Exception e) {
                logger.warn("Supabase API token verification notice: {}", e.getMessage());
            }
        }
        return null;
    }

    private String parseSupabaseJwtEmail(String token, byte[] keyBytes) {
        if (keyBytes == null || keyBytes.length < 32) {
            return null;
        }
        try {
            Key key = Keys.hmacShaKeyFor(keyBytes);
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            String aud = claims.getAudience();
            if (aud != null && !"authenticated".equalsIgnoreCase(aud)) {
                return null;
            }
            return SecuritySanitizer.sanitizeEmail(claims.get("email", String.class));
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Legacy unauthenticated password synchronization endpoint — permanently disabled for security.
     * Clients must reset passwords via the 6-digit email OTP verification flow (/api/auth/reset-password).
     */
    @PostMapping("/sync-password")
    public ResponseEntity<?> syncPassword(@RequestBody(required = false) Map<String, String> payload) {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
            "success", false,
            "message", "Direct password synchronization has been disabled. Please use the 6-digit email OTP reset flow."
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

        // Automatic activation for staff accounts upon correct credentials match (no OTP required)
        if (user.getRole() == User.Role.STAFF && user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            user.setStatus(User.AccountStatus.ACTIVE);
            userRepository.save(user);
        }

        // Account status check: require 6-digit OTP email verification (only for patients/customers)
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
     * Generates a 6-digit confidential verification OTP and emails it directly (Zero links).
     * NEVER returns reset tokens, OTPs, or links in the API response.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        User user = null;

        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
            // Check if client exists in customer CRM
            Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
            if (customerOpt.isPresent()) {
                Customer c = customerOpt.get();
                User newUser = new User();
                newUser.setEmail(cleanEmail);
                newUser.setFullName(c.getFullName() != null ? c.getFullName() : "Valued Client");
                newUser.setPhone(c.getPhone());
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setRole(User.Role.CUSTOMER);
                newUser.setStatus(User.AccountStatus.ACTIVE);
                user = userRepository.save(newUser);
            } else if (cleanEmail.contains("@")) {
                // Auto-provision user account so the user can receive the verification code and set their password
                User newUser = new User();
                newUser.setEmail(cleanEmail);
                newUser.setFullName("Valued Client");
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setRole(User.Role.CUSTOMER);
                newUser.setStatus(User.AccountStatus.ACTIVE);
                user = userRepository.save(newUser);
            }
        }

        if (user != null) {
            try {
                boolean sent = otpService.generateAndSendPasswordResetOtp(user.getEmail(), user.getFullName());
                if (!sent) {
                    String lastErr = emailService.getLastError();
                    logger.warn("Brevo/SMTP email dispatch failure for {}: {}", cleanEmail, lastErr);
                    return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                        "success", false,
                        "message", "Verification code could not be sent: " + (lastErr != null ? lastErr : "Please check your network and try again.")
                    ));
                }
            } catch (IllegalStateException e) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
                ));
            } catch (Exception e) {
                logger.error("Error dispatching password reset OTP to {}: {}", cleanEmail, e.getMessage(), e);
                return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to dispatch verification code: " + e.getMessage()
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "A 6-digit password reset verification code has been dispatched to " + cleanEmail + ". Please check your inbox."
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
     * Complete Password Reset:
     * Primary Flow: Verified via 6-digit Email OTP (Zero links required)
     * Legacy Flow: Verified via reset token
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters long."));
        }

        // 1. Password reset via 6-digit OTP verification (Primary Client Portal flow)
        if (email != null && !email.trim().isEmpty() && otp != null && !otp.trim().isEmpty()) {
            String cleanEmail = email.trim().toLowerCase();
            Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid email address or verification code."));
            }

            boolean isOtpValid = otpService.verifyOtp(cleanEmail, otp.trim());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid or expired 6-digit verification code. Please request a new code."));
            }

            User user = userOpt.get();
            user.setPassword(passwordEncoder.encode(newPassword.trim()));
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);

            auditLogService.record("PASSWORD_RESET_OTP", cleanEmail, user.getRole().name(), "USER", user.getId().toString(), "Password reset successfully via 6-digit email OTP verification");

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Your password has been reset successfully! You can now log in with your new password."
            ));
        }

        // 2. Legacy fallback via token
        if (token != null && !token.trim().isEmpty()) {
            Optional<User> userOpt = userRepository.findByResetToken(token.trim());
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid or expired reset code."));
            }

            User user = userOpt.get();
            if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password reset code has expired. Please request a new one."));
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

        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email address and 6-digit verification code are required."));
    }

    /**
     * Dispatch OTP for Admin and Staff Password Change
     */
    @PostMapping({"/password/request-otp", "/admin-password/request-otp"})
    public ResponseEntity<?> requestPasswordChangeOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email address is required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Account not found."));
        }

        User user = userOpt.get();
        boolean isInternal = (user.getRole() == User.Role.SUPER_ADMIN || 
                              user.getRole() == User.Role.ADMIN || 
                              user.getRole() == User.Role.STAFF);

        if (!isInternal) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Password OTP request is restricted to clinical personnel."));
        }

        try {
            String roleName = user.getRole() == User.Role.STAFF ? "Clinical Staff" : "Clinic Administrator";
            boolean sent = otpService.generateAndSendOtp(cleanEmail, user.getFullName() != null ? user.getFullName() : roleName);
            auditLogService.record("PASSWORD_OTP_REQUESTED", cleanEmail, user.getRole().name(), "USER", user.getId().toString(), roleName + " requested password change OTP");
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit security verification OTP has been sent to " + cleanEmail + ". Enter the OTP to authorize your password update."
            ));
        } catch (IllegalStateException ise) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", ise.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to dispatch OTP: " + e.getMessage()));
        }
    }

    /**
     * Authenticated Password Change
     * Requires valid 6-digit email OTP for ADMIN, SUPER_ADMIN, and STAFF roles.
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");
        String otp = payload.get("otp");

        if (email == null || oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "All fields are required."));
        }

        String cleanEmail = email.trim().toLowerCase();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            if (!auth.getName().trim().equalsIgnoreCase(cleanEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "You can only change the password for your own authenticated account."
                ));
            }
        }
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        User user = userOpt.get();

        // For ADMIN, SUPER_ADMIN, and STAFF accounts: OTP verification is strictly mandatory
        boolean requiresOtp = (user.getRole() == User.Role.SUPER_ADMIN || 
                               user.getRole() == User.Role.ADMIN || 
                               user.getRole() == User.Role.STAFF);

        if (requiresOtp) {
            String roleTitle = (user.getRole() == User.Role.STAFF) ? "Staff" : "Admin";
            if (otp == null || otp.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "requiresOtp", true,
                    "message", roleTitle + " password change requires 6-digit email OTP verification. Please request an OTP first."
                ));
            }

            boolean isOtpValid = otpService.verifyOtp(cleanEmail, otp.trim());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "requiresOtp", true,
                    "message", "Invalid or expired OTP verification code. Please check your email and try again."
                ));
            }
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Incorrect current password."));
        }

        if (newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be at least 6 characters."));
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        auditLogService.record("PASSWORD_CHANGED", cleanEmail, user.getRole().name(), "USER", user.getId().toString(), "Password changed successfully" + (requiresOtp ? " with 6-digit OTP verification" : ""));

        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully."));
    }
}
