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
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SigningKeyResolverAdapter;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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
    private final Map<String, PublicKey> supabaseJwksCache = new ConcurrentHashMap<>();
    private volatile long jwksCacheLastFetchedMs = 0L;

    /**
     * Customer Self-Registration
     * Direct instant registration: creates ACTIVE customer, issues JWT, and grants direct portal access.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().trim().length() < 6 || request.getPassword().trim().length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be between 6 and 128 characters long."));
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

        // Generate and dispatch 6-digit OTP verification code cleanly (never falsely report delivery on failure)
        boolean otpSent;
        try {
            otpSent = otpService.generateAndSendOtp(email, fullName);
        } catch (IllegalStateException ise) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                "success", false,
                "emailSent", false,
                "requiresVerification", true,
                "email", user.getEmail(),
                "message", ise.getMessage()
            ));
        } catch (Exception e) {
            logger.warn("OTP dispatch error for {}: {}", SecuritySanitizer.maskEmail(email), e.getMessage());
            otpSent = false;
        }

        auditLogService.record(
            "REGISTER_PENDING_OTP",
            email,
            user.getRole().name(),
            "USER",
            user.getId() != null ? user.getId().toString() : "N/A",
            "Client registered; awaiting 6-digit OTP email verification (otpDispatched=" + otpSent + ")"
        );

        if (!otpSent) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "success", false,
                "emailSent", false,
                "requiresVerification", true,
                "email", user.getEmail(),
                "message", "Your account registration was saved as pending verification, but we could not deliver the verification email right now. Please click Resend Code shortly."
            ));
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("emailSent", true);
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
        String email = payload != null ? payload.get("email") : null;
        String otp = payload != null ? payload.get("otp") : null;

        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null || otp == null || !otp.trim().matches("^\\d{6}$")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address and 6-digit verification code are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid or expired verification code. Please check and try again."
            ));
        }
        User user = userOpt.get();
        if (user.getStatus() == User.AccountStatus.DISABLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Your account has been deactivated. Please contact clinic management."
            ));
        }

        boolean valid = otpService.verifyOtpForPurpose(cleanEmail, otp.trim(), OtpService.PURPOSE_REGISTRATION);

        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, 
                "message", "Invalid or expired verification code. Please check and try again."
            ));
        }

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

        // Generate JWT Token bound to current token version
        String token = issueJwtForUser(user, "CUSTOMER");

        auditLogService.record("REGISTER_OTP_VERIFIED", cleanEmail, "CUSTOMER", "USER",
                user.getId() != null ? user.getId().toString() : "N/A",
                "Customer email verified via 6-digit OTP");

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
        String email = payload != null ? payload.get("email") : null;
        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address is required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Account not found."));
        }

        User user = userOpt.get();
        if (user.getStatus() == User.AccountStatus.DISABLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Your account has been deactivated. Please contact clinic management."));
        }
        if (user.getStatus() == User.AccountStatus.ACTIVE) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Account is already verified. Please sign in."));
        }

        try {
            boolean sent = otpService.generateAndSendOtp(cleanEmail, user.getFullName());
            if (!sent) {
                logger.warn("Verification email delivery failed for {}", SecuritySanitizer.maskEmail(cleanEmail));
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "emailSent", false,
                    "message", "Verification email could not be delivered at the moment. Please try again shortly."
                ));
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "emailSent", true,
                "message", "A new verification code has been dispatched to your email address."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to dispatch verification email for {}", SecuritySanitizer.maskEmail(cleanEmail), e);
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

        boolean hasUrlConfig = supabaseUrl != null && !supabaseUrl.trim().isEmpty();
        boolean hasApiConfig = hasUrlConfig && supabaseAnonKey != null && !supabaseAnonKey.trim().isEmpty();
        boolean hasJwtConfig = supabaseJwtSecret != null && !supabaseJwtSecret.trim().isEmpty();

        if (!hasApiConfig && !hasJwtConfig && !hasUrlConfig) {
            logger.warn("Supabase user sync rejected: SUPABASE_JWT_SECRET or SUPABASE_URL/SUPABASE_ANON_KEY is not configured.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "success", false,
                "message", "Supabase SSO verification is not configured on the server."
            ));
        }

        String email = verifySupabaseTokenAndExtractEmail(accessToken.trim(), hasUrlConfig, hasApiConfig, hasJwtConfig);
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
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(fullName);
            newUser.setPhone(phone);
            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setRole(User.Role.CUSTOMER);
            newUser.setStatus(User.AccountStatus.ACTIVE);
            try {
                user = userRepository.save(newUser);
            } catch (DataIntegrityViolationException dive) {
                user = userRepository.findByEmail(email).orElseThrow(() -> dive);
            }
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

        String token = issueJwtForUser(user, roleStr);

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

    private String verifySupabaseTokenAndExtractEmail(String accessToken, boolean hasUrlConfig, boolean hasApiConfig, boolean hasJwtConfig) {
        if (hasJwtConfig) {
            String trimmedSecret = supabaseJwtSecret.trim();
            String email = parseSupabaseJwtEmail(accessToken, Keys.hmacShaKeyFor(trimmedSecret.getBytes(StandardCharsets.UTF_8)));
            if (email != null) {
                return email;
            }
            try {
                byte[] decoded = Base64.getDecoder().decode(trimmedSecret);
                if (decoded.length >= 32) {
                    email = parseSupabaseJwtEmail(accessToken, Keys.hmacShaKeyFor(decoded));
                    if (email != null) {
                        return email;
                    }
                }
            } catch (IllegalArgumentException ignored) {}
        }

        if (hasUrlConfig) {
            String email = verifySupabaseJwtViaJwks(accessToken);
            if (email != null) {
                return email;
            }
        }

        if (hasApiConfig) {
            try {
                String baseUrl = supabaseUrl.trim().replaceAll("/+$", "");
                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(8))
                        .build();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/auth/v1/user"))
                        .timeout(Duration.ofSeconds(10))
                        .header("Authorization", "Bearer " + accessToken)
                        .header("apikey", supabaseAnonKey.trim())
                        .GET()
                        .build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    String verifiedEmail = root.path("email").asText("");
                    if (verifiedEmail.isEmpty()) {
                        verifiedEmail = root.path("user_metadata").path("email").asText("");
                    }
                    String userId = root.path("id").asText("");
                    if (!userId.isEmpty() && !verifiedEmail.isEmpty()) {
                        return SecuritySanitizer.sanitizeEmail(verifiedEmail);
                    }
                } else {
                    logger.warn("Supabase /auth/v1/user returned HTTP {}", response.statusCode());
                }
            } catch (Exception e) {
                logger.warn("Supabase API token verification notice: {}", e.getMessage());
            }
        }
        return null;
    }

    private String verifySupabaseJwtViaJwks(String accessToken) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKeyResolver(new SigningKeyResolverAdapter() {
                        @Override
                        public Key resolveSigningKey(JwsHeader header, Claims claims) {
                            String kid = header != null ? header.getKeyId() : null;
                            return resolveSupabasePublicKey(kid);
                        }
                    })
                    .build()
                    .parseClaimsJws(accessToken)
                    .getBody();
            return extractValidatedSupabaseEmail(claims);
        } catch (Exception e) {
            return null;
        }
    }

    private PublicKey resolveSupabasePublicKey(String kid) {
        long now = System.currentTimeMillis();
        if (supabaseJwksCache.isEmpty() || (kid != null && !supabaseJwksCache.containsKey(kid) && (now - jwksCacheLastFetchedMs) > 30_000L)) {
            refreshSupabaseJwks();
        }
        if (kid != null && supabaseJwksCache.containsKey(kid)) {
            return supabaseJwksCache.get(kid);
        }
        if (supabaseJwksCache.size() == 1) {
            return supabaseJwksCache.values().iterator().next();
        }
        return null;
    }

    private synchronized void refreshSupabaseJwks() {
        long now = System.currentTimeMillis();
        if (!supabaseJwksCache.isEmpty() && (now - jwksCacheLastFetchedMs) < 15_000L) {
            return;
        }
        try {
            String baseUrl = supabaseUrl.trim().replaceAll("/+$", "");
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/auth/v1/.well-known/jwks.json"))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return;
            }
            JsonNode keysNode = objectMapper.readTree(response.body()).path("keys");
            if (!keysNode.isArray()) {
                return;
            }
            Map<String, PublicKey> parsedKeys = new HashMap<>();
            for (JsonNode keyNode : keysNode) {
                String kty = keyNode.path("kty").asText("");
                String kid = keyNode.path("kid").asText("default");
                PublicKey pubKey = null;
                if ("EC".equalsIgnoreCase(kty)) {
                    String crv = keyNode.path("crv").asText("P-256");
                    String curveStdName = "P-384".equalsIgnoreCase(crv) ? "secp384r1" : ("P-521".equalsIgnoreCase(crv) ? "secp521r1" : "secp256r1");
                    String xStr = keyNode.path("x").asText("");
                    String yStr = keyNode.path("y").asText("");
                    if (!xStr.isEmpty() && !yStr.isEmpty()) {
                        AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
                        params.init(new ECGenParameterSpec(curveStdName));
                        ECParameterSpec ecSpec = params.getParameterSpec(ECParameterSpec.class);
                        ECPoint point = new ECPoint(
                                new BigInteger(1, Base64.getUrlDecoder().decode(xStr)),
                                new BigInteger(1, Base64.getUrlDecoder().decode(yStr)));
                        pubKey = KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point, ecSpec));
                    }
                } else if ("RSA".equalsIgnoreCase(kty)) {
                    String nStr = keyNode.path("n").asText("");
                    String eStr = keyNode.path("e").asText("");
                    if (!nStr.isEmpty() && !eStr.isEmpty()) {
                        pubKey = KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(
                                new BigInteger(1, Base64.getUrlDecoder().decode(nStr)),
                                new BigInteger(1, Base64.getUrlDecoder().decode(eStr))));
                    }
                }
                if (pubKey != null) {
                    parsedKeys.put(kid, pubKey);
                }
            }
            if (!parsedKeys.isEmpty()) {
                supabaseJwksCache.clear();
                supabaseJwksCache.putAll(parsedKeys);
                jwksCacheLastFetchedMs = now;
            }
        } catch (Exception e) {
            logger.warn("Supabase JWKS fetch notice: {}", e.getMessage());
        }
    }

    private String parseSupabaseJwtEmail(String token, Key key) {
        if (key == null) {
            return null;
        }
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return extractValidatedSupabaseEmail(claims);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extractValidatedSupabaseEmail(Claims claims) {
        Object audObj = claims.get("aud");
        if (audObj instanceof String audStr) {
            if (!"authenticated".equalsIgnoreCase(audStr)) {
                return null;
            }
        } else if (audObj instanceof Collection<?> audList) {
            boolean matches = audList.stream().anyMatch(v -> v != null && "authenticated".equalsIgnoreCase(v.toString()));
            if (!matches) {
                return null;
            }
        }
        String rawEmail = claims.get("email", String.class);
        if (rawEmail == null) {
            Object metaObj = claims.get("user_metadata");
            if (metaObj instanceof Map<?, ?> metaMap && metaMap.get("email") != null) {
                rawEmail = metaMap.get("email").toString();
            }
        }
        return SecuritySanitizer.sanitizeEmail(rawEmail);
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

        // Invited staff accounts cannot sign in before completing single-use invitation activation
        if (user.getRole() == User.Role.STAFF && user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "requiresStaffActivation", true,
                "message", "Your staff account awaits onboarding activation. Please complete account setup using the invitation link sent to your email."
            ));
        }

        // Account status check: require 6-digit OTP email verification for pending clients
        if (user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            boolean sent = false;
            String verificationMsg;
            try {
                sent = otpService.generateAndSendOtp(cleanEmail, user.getFullName());
                verificationMsg = sent
                        ? "Your email address is pending verification. A fresh 6-digit verification code has been dispatched to your email."
                        : "Your email address is pending verification, and we could not deliver a verification email right now. Please click Resend Code shortly.";
            } catch (IllegalStateException ise) {
                verificationMsg = "Your email address is pending verification. A verification code was sent recently; please enter it or wait a moment to resend.";
            } catch (Exception e) {
                verificationMsg = "Your email address is pending verification, and verification email delivery is temporarily unavailable. Please click Resend Code shortly.";
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "requiresVerification", true,
                "emailSent", sent,
                "email", cleanEmail,
                "message", verificationMsg
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

        String token = issueJwtForUser(user, roleStr);

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
        Map<String, String> internalCreds = credentials != null ? new HashMap<>(credentials) : new HashMap<>();
        internalCreds.put("portal", "internal");
        return login(internalCreds);
    }

    /**
     * Staff Activation via Single-Use Invite Token
     */
    @PostMapping("/staff/activate")
    public ResponseEntity<?> activateStaff(@RequestBody Map<String, String> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Activation payload is required."));
        }
        String token = payload.get("token");
        String password = payload.get("password");
        String fullName = SecuritySanitizer.sanitizeText(payload.get("fullName"), 100);

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invitation token is required."));
        }
        if (password == null || password.trim().length() < 6 || password.trim().length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be between 6 and 128 characters long."));
        }

        Optional<StaffInvitation> inviteOpt = staffInvitationRepository.findByToken(token.trim());
        if (inviteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid invitation token."));
        }

        StaffInvitation invitation = inviteOpt.get();
        if (invitation.getStatus() != StaffInvitation.InvitationStatus.INVITED) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "This staff invitation has already been used or revoked."));
        }
        if (invitation.getExpiresAt() == null || invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(StaffInvitation.InvitationStatus.EXPIRED);
            staffInvitationRepository.save(invitation);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invitation link has expired. Please contact the clinic owner."));
        }

        String cleanEmail = invitation.getEmail().trim().toLowerCase();
        Optional<User> existingOpt = userRepository.findByEmail(cleanEmail);
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (existing.getRole() == User.Role.SUPER_ADMIN || existing.getRole() == User.Role.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Cannot overwrite administrator privileges through staff activation."));
            }
            if (existing.getStatus() == User.AccountStatus.DISABLED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Your staff account has been disabled. Please contact clinic management."));
            }
        }

        User staffUser = existingOpt.orElseGet(User::new);
        staffUser.setEmail(cleanEmail);
        staffUser.setFullName(fullName != null && !fullName.isEmpty() ? fullName : invitation.getFullName());
        staffUser.setPassword(passwordEncoder.encode(password.trim()));
        staffUser.setRole(User.Role.STAFF);
        staffUser.setStatus(User.AccountStatus.ACTIVE);
        staffUser.incrementTokenVersion();
        userRepository.save(staffUser);

        invitation.setStatus(StaffInvitation.InvitationStatus.ACTIVE);
        invitation.setToken(null);
        staffInvitationRepository.save(invitation);

        auditLogService.record("STAFF_ACTIVATED", cleanEmail, "STAFF", "USER",
                staffUser.getId() != null ? staffUser.getId().toString() : cleanEmail,
                "Staff account activated and personal password set via onboarding token");

        String jwtToken = issueJwtForUser(staffUser, "STAFF");

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
     * Never auto-provisions arbitrary stranger emails, never resets internal privileged accounts via client flow,
     * and returns a uniform non-enumerating response.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload != null ? payload.get("email") : null;
        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email address is required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        User user = null;

        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
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
            }
        }

        if (user != null) {
            boolean isInternal = (user.getRole() == User.Role.SUPER_ADMIN
                    || user.getRole() == User.Role.ADMIN
                    || user.getRole() == User.Role.STAFF);
            if (isInternal) {
                auditLogService.record("PASSWORD_RESET_BLOCKED_INTERNAL", cleanEmail, user.getRole().name(), "USER",
                        user.getId() != null ? user.getId().toString() : "N/A",
                        "Blocked public forgot-password OTP request for internal privileged role");
            } else if (user.getStatus() != User.AccountStatus.DISABLED) {
                try {
                    boolean sent = otpService.generateAndSendPasswordResetOtp(user.getEmail(), user.getFullName());
                    if (!sent) {
                        logger.warn("Email dispatch unavailable for password reset request ({})", SecuritySanitizer.maskEmail(cleanEmail));
                        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                            "success", false,
                            "message", "Verification code delivery is temporarily unavailable. Please try again shortly."
                        ));
                    }
                } catch (IllegalStateException e) {
                    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "success", false,
                        "message", e.getMessage()
                    ));
                } catch (Exception e) {
                    logger.error("Error dispatching password reset OTP to {}", SecuritySanitizer.maskEmail(cleanEmail), e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "success", false,
                        "message", "Failed to dispatch password reset verification code."
                    ));
                }
            }
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "If an account with that email exists in our system, a 6-digit password reset verification code has been dispatched to your inbox."
        ));
    }

    /**
     * Legacy reset token verification endpoint — permanently disabled in favor of 6-digit OTP reset.
     */
    @GetMapping("/verify-reset-token")
    public ResponseEntity<?> verifyResetToken(@RequestParam(value = "token", required = false) String token) {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
            "valid", false,
            "message", "Reset links are disabled. Please use the 6-digit email OTP reset flow."
        ));
    }

    /**
     * Complete Password Reset strictly via 6-digit Email OTP (Zero reset links).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request payload is required."));
        }
        String email = payload.get("email");
        String otp = payload.get("otp");
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");

        if ((otp == null || otp.trim().isEmpty()) && token != null && !token.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "success", false,
                "message", "Password reset links have been retired. Please request and enter a 6-digit email OTP."
            ));
        }

        if (newPassword == null || newPassword.trim().length() < 6 || newPassword.trim().length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be between 6 and 128 characters long."));
        }

        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null || otp == null || !otp.trim().matches("^\\d{6}$")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid email address and 6-digit verification code are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid email address or verification code."));
        }

        User user = userOpt.get();
        if (user.getStatus() == User.AccountStatus.DISABLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Your account has been deactivated. Please contact clinic management."
            ));
        }
        if (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.STAFF) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Staff and Admin accounts must change passwords through the authenticated internal portal."
            ));
        }

        boolean isOtpValid = otpService.verifyOtpForPurpose(cleanEmail, otp.trim(), OtpService.PURPOSE_PASSWORD_RESET);
        if (!isOtpValid) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid or expired 6-digit verification code. Please request a new code."));
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        user.incrementTokenVersion();
        if (user.getStatus() == User.AccountStatus.PENDING_VERIFICATION) {
            user.setStatus(User.AccountStatus.ACTIVE);
        }
        userRepository.save(user);

        auditLogService.record("PASSWORD_RESET_OTP", cleanEmail, user.getRole().name(), "USER",
                user.getId() != null ? user.getId().toString() : "N/A",
                "Password reset successfully via 6-digit email OTP verification");

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Your password has been reset successfully! You can now log in with your new password."
        ));
    }

    /**
     * Dispatch OTP for Admin and Staff Password Change
     */
    @PostMapping({"/password/request-otp", "/admin-password/request-otp"})
    public ResponseEntity<?> requestPasswordChangeOtp(@RequestBody Map<String, String> payload) {
        String email = payload != null ? payload.get("email") : null;
        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid email address is required."));
        }

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
            boolean sent = otpService.generateAndSendPasswordChangeOtp(cleanEmail, user.getFullName() != null ? user.getFullName() : roleName);
            if (!sent) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "OTP verification email could not be delivered right now. Please try again shortly."
                ));
            }
            auditLogService.record("PASSWORD_OTP_REQUESTED", cleanEmail, user.getRole().name(), "USER",
                    user.getId() != null ? user.getId().toString() : "N/A",
                    roleName + " requested password change OTP");
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit security verification OTP has been sent to " + cleanEmail + ". Enter the OTP to authorize your password update."
            ));
        } catch (IllegalStateException ise) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", ise.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to dispatch password change OTP for {}", SecuritySanitizer.maskEmail(cleanEmail), e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to dispatch verification OTP."));
        }
    }

    /**
     * Authenticated Password Change
     * Requires valid 6-digit email OTP for ADMIN, SUPER_ADMIN, and STAFF roles.
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request payload is required."));
        }
        String email = payload.get("email");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");
        String otp = payload.get("otp");

        if (email == null || oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "All fields are required."));
        }

        String cleanEmail = SecuritySanitizer.sanitizeEmail(email);
        if (cleanEmail == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid email address is required."));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "success", false,
                "message", "Authentication required to change password."
            ));
        }
        if (!auth.getName().trim().equalsIgnoreCase(cleanEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "You can only change the password for your own authenticated account."
            ));
        }

        if (newPassword.trim().length() < 6 || newPassword.trim().length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be between 6 and 128 characters."));
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

            boolean isOtpValid = otpService.verifyOtpForPurpose(cleanEmail, otp.trim(), OtpService.PURPOSE_PASSWORD_CHANGE);
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

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.incrementTokenVersion();
        userRepository.save(user);

        auditLogService.record("PASSWORD_CHANGED", cleanEmail, user.getRole().name(), "USER",
                user.getId() != null ? user.getId().toString() : "N/A",
                "Password changed successfully" + (requiresOtp ? " with 6-digit OTP verification" : ""));

        return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully. Active prior sessions have been signed out."));
    }

    /**
     * Authenticated Logout: increments tokenVersion so existing JWTs are revoked server-side.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "success", false,
                "message", "Authentication required to sign out."
            ));
        }

        String cleanEmail = SecuritySanitizer.sanitizeEmail(auth.getName());
        if (cleanEmail != null) {
            userRepository.findByEmail(cleanEmail).ifPresent(user -> {
                user.incrementTokenVersion();
                userRepository.save(user);
                auditLogService.record("LOGOUT", cleanEmail, user.getRole().name(), "USER",
                        user.getId() != null ? user.getId().toString() : "N/A",
                        "User logged out; active session tokens revoked");
            });
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out securely."));
    }

    private String issueJwtForUser(User user, String roleAuthority) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleAuthority)));
        return user.getTokenVersion() == 0L
                ? jwtTokenProvider.generateToken(auth)
                : jwtTokenProvider.generateToken(auth, user.getTokenVersion());
    }
}
