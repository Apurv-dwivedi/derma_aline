package com.dermaaline.backend.controller;

import com.dermaaline.backend.dto.RegisterRequest;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.security.JwtTokenProvider;
import com.dermaaline.backend.service.AuditLogService;
import com.dermaaline.backend.service.EmailService;
import com.dermaaline.backend.service.OtpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private StaffInvitationRepository staffInvitationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private EmailService emailService;

    @Mock
    private OtpService otpService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthController authController;

    private ObjectMapper objectMapper = new ObjectMapper();

    private static final String TEST_SUPABASE_JWT_SECRET = "SyntheticSupabaseTestJwtSecretKeyAtLeast32BytesLongForJUnit!";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "supabaseJwtSecret", TEST_SUPABASE_JWT_SECRET);
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    private String createSignedSupabaseTestToken(String email) {
        return Jwts.builder()
                .setSubject("sub-" + email)
                .claim("email", email)
                .setAudience("authenticated")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 300_000L))
                .signWith(Keys.hmacShaKeyFor(TEST_SUPABASE_JWT_SECRET.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("newuser@derma.com");
        request.setPassword("Secret123");
        request.setFullName("John Doe");

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail("newuser@derma.com");
        savedUser.setFullName("John Doe");
        savedUser.setRole(User.Role.CUSTOMER);

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secret123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.email").value("newuser@derma.com"));

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testPublicLoginRejectsAdmin() throws Exception {
        User adminUser = new User();
        adminUser.setEmail("admin@dermaaline.com");
        adminUser.setPassword("encodedPassword");
        adminUser.setRole(User.Role.SUPER_ADMIN);

        when(userRepository.findByEmail("admin@dermaaline.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("Password123", "encodedPassword")).thenReturn(true);

        Map<String, String> credentials = Map.of(
                "email", "admin@dermaaline.com",
                "password", "Password123",
                "portal", "public");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Salon Portal")));
    }

    @Test
    void testPublicLoginRejectsStaff() throws Exception {
        User staffUser = new User();
        staffUser.setEmail("staff@dermaaline.com");
        staffUser.setPassword("encodedPassword");
        staffUser.setRole(User.Role.STAFF);

        when(userRepository.findByEmail("staff@dermaaline.com")).thenReturn(Optional.of(staffUser));
        when(passwordEncoder.matches("Password123", "encodedPassword")).thenReturn(true);

        Map<String, String> credentials = Map.of(
                "email", "staff@dermaaline.com",
                "password", "Password123",
                "portal", "public");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Salon Portal")));
    }

    @Test
    void testPublicLoginPermitsCustomer() throws Exception {
        User customer = new User();
        customer.setId(2L);
        customer.setEmail("patient@example.com");
        customer.setPassword("encodedPassword");
        customer.setFullName("Jane Patient");
        customer.setRole(User.Role.CUSTOMER);
        customer.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("Password123", "encodedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("mock-patient-jwt");

        Map<String, String> credentials = Map.of(
                "email", "patient@example.com",
                "password", "Password123",
                "portal", "client");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.token").value("mock-patient-jwt"));
    }

    @Test
    void testInternalLoginPermitsStaff() throws Exception {
        User staffUser = new User();
        staffUser.setId(3L);
        staffUser.setEmail("staff@dermaaline.com");
        staffUser.setPassword("encodedPassword");
        staffUser.setFullName("Salon Therapist");
        staffUser.setRole(User.Role.STAFF);
        staffUser.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("staff@dermaaline.com")).thenReturn(Optional.of(staffUser));
        when(passwordEncoder.matches("MockStaffPass123", "encodedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("mock-staff-jwt");

        Map<String, String> credentials = Map.of(
                "email", "staff@dermaaline.com",
                "password", "MockStaffPass123");

        mockMvc.perform(post("/api/auth/internal-login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.role").value("STAFF"))
                .andExpect(jsonPath("$.token").value("mock-staff-jwt"));
    }

    @Test
    void testInternalLoginPermitsAdmin() throws Exception {
        User adminUser = new User();
        adminUser.setId(4L);
        adminUser.setEmail("admin@dermaaline.com");
        adminUser.setPassword("encodedPassword");
        adminUser.setFullName("Salon Admin");
        adminUser.setRole(User.Role.SUPER_ADMIN);
        adminUser.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("admin@dermaaline.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("Admin@2026", "encodedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("mock-admin-jwt");

        Map<String, String> credentials = Map.of(
                "email", "admin@dermaaline.com",
                "password", "Admin@2026");

        mockMvc.perform(post("/api/auth/internal-login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.token").value("mock-admin-jwt"));
    }

    @Test
    void testInternalLoginRejectsCustomer() throws Exception {
        User customer = new User();
        customer.setEmail("patient@example.com");
        customer.setPassword("encodedPassword");
        customer.setRole(User.Role.CUSTOMER);
        customer.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("Password123", "encodedPassword")).thenReturn(true);

        Map<String, String> credentials = Map.of(
                "email", "patient@example.com",
                "password", "Password123");

        mockMvc.perform(post("/api/auth/internal-login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Access Denied")));
    }

    @Test
    void testForgotPasswordSuccess() throws Exception {
        User user = new User();
        user.setEmail("user@example.com");
        user.setFullName("User Test");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(otpService.generateAndSendPasswordResetOtp("user@example.com", "User Test")).thenReturn(true);

        Map<String, String> payload = Map.of("email", "user@example.com");

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsStringIgnoringCase("password reset")));

        verify(otpService, times(1)).generateAndSendPasswordResetOtp(eq("user@example.com"), eq("User Test"));
    }

    @Test
    void testResetPasswordViaOtpSuccess() throws Exception {
        User user = new User();
        user.setId(10L);
        user.setEmail("user@example.com");
        user.setRole(User.Role.CUSTOMER);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(otpService.verifyOtp("user@example.com", "123456")).thenReturn(true);
        when(passwordEncoder.encode("NewSecret123")).thenReturn("encodedNewSecret");

        Map<String, String> payload = Map.of(
                "email", "user@example.com",
                "otp", "123456",
                "newPassword", "NewSecret123");

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("reset successfully")));

        verify(userRepository, times(1)).save(user);
    }

    @Test
    void testResetPasswordViaTokenSuccess() throws Exception {
        User user = new User();
        user.setEmail("user@example.com");
        user.setResetToken("valid-token-123");
        user.setResetTokenExpiry(java.time.LocalDateTime.now().plusHours(1));

        when(userRepository.findByResetToken("valid-token-123")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecret123")).thenReturn("encodedNewSecret");

        Map<String, String> payload = Map.of(
                "token", "valid-token-123",
                "newPassword", "NewSecret123");

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("reset successfully")));

        verify(userRepository, times(1)).save(user);
    }

    // ==========================================
    // SUPABASE HYBRID AUTH & GOOGLE SSO TESTS
    // ==========================================

    @Test
    void testSyncSupabaseUserRejectsMissingAccessToken() throws Exception {
        Map<String, String> payload = Map.of(
                "email", "attacker@example.com",
                "provider", "google");

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testSyncSupabaseUserRejectsForgedToken() throws Exception {
        Map<String, String> payload = Map.of(
                "accessToken", "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFkbWluQGRlcm1hYWxpbmUuY29tIn0.forgedsignature",
                "provider", "google");

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testSyncSupabaseUserNewCustomer() throws Exception {
        String validToken = createSignedSupabaseTestToken("googleclient@example.com");
        Map<String, String> payload = Map.of(
                "accessToken", validToken,
                "fullName", "Google Client",
                "phone", "+919988776655",
                "provider", "google");

        User savedUser = new User();
        savedUser.setId(101L);
        savedUser.setEmail("googleclient@example.com");
        savedUser.setFullName("Google Client");
        savedUser.setRole(User.Role.CUSTOMER);
        savedUser.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("googleclient@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("randomSecurePasswordHash");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(customerRepository.findByEmail("googleclient@example.com")).thenReturn(Optional.empty());
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("supabase-synced-jwt");

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.token").value("supabase-synced-jwt"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.email").value("googleclient@example.com"));

        verify(userRepository, times(1)).save(any(User.class));
        verify(customerRepository, times(1)).save(any(Customer.class));
        verify(auditLogService, times(1)).record(eq("SUPABASE_AUTH_SYNC"), eq("googleclient@example.com"), anyString(),
                anyString(), anyString(), anyString());
    }

    @Test
    void testSyncSupabaseUserExistingPendingCustomerActivates() throws Exception {
        String validToken = createSignedSupabaseTestToken("pendingclient@example.com");
        Map<String, String> payload = Map.of(
                "accessToken", validToken,
                "fullName", "Pending Client",
                "provider", "supabase_email_otp");

        User existingUser = new User();
        existingUser.setId(102L);
        existingUser.setEmail("pendingclient@example.com");
        existingUser.setFullName("Pending Client");
        existingUser.setRole(User.Role.CUSTOMER);
        existingUser.setStatus(User.AccountStatus.PENDING_VERIFICATION);

        when(userRepository.findByEmail("pendingclient@example.com")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(existingUser)).thenReturn(existingUser);
        when(customerRepository.findByEmail("pendingclient@example.com")).thenReturn(Optional.of(new Customer()));
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("activated-customer-jwt");

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.token").value("activated-customer-jwt"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));

        assertEquals(User.AccountStatus.ACTIVE, existingUser.getStatus(),
                "Customer status should be updated to ACTIVE upon Supabase sync");
        verify(userRepository, times(1)).save(existingUser);
    }

    @Test
    void testSyncSupabaseUserBlocksAdminAndStaffSso() throws Exception {
        String validAdminToken = createSignedSupabaseTestToken("admin@dermaaline.com");
        Map<String, String> payload = Map.of(
                "accessToken", validAdminToken,
                "provider", "google");

        User adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@dermaaline.com");
        adminUser.setRole(User.Role.SUPER_ADMIN);
        adminUser.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("admin@dermaaline.com")).thenReturn(Optional.of(adminUser));

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Restricted")));
    }

    @Test
    void testSyncSupabaseUserRejectsDisabledAccount() throws Exception {
        String validToken = createSignedSupabaseTestToken("deactivated@example.com");
        Map<String, String> payload = Map.of(
                "accessToken", validToken,
                "provider", "google");

        User deactivatedUser = new User();
        deactivatedUser.setEmail("deactivated@example.com");
        deactivatedUser.setRole(User.Role.CUSTOMER);
        deactivatedUser.setStatus(User.AccountStatus.DISABLED);

        when(userRepository.findByEmail("deactivated@example.com")).thenReturn(Optional.of(deactivatedUser));

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("deactivated")));
    }

    @Test
    void testSyncPasswordDisabledForSecurity() throws Exception {
        Map<String, String> payload = Map.of(
                "email", "user@example.com",
                "newPassword", "NewSecret2026");

        mockMvc.perform(post("/api/auth/sync-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false));

        verify(userRepository, never()).save(any());
    }
}
