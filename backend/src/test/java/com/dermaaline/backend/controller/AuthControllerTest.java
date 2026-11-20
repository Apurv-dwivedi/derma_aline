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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
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
            "portal", "public"
        );

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
            "portal", "public"
        );

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
            "portal", "client"
        );

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
        when(passwordEncoder.matches("Staff@2026", "encodedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("mock-staff-jwt");

        Map<String, String> credentials = Map.of(
            "email", "staff@dermaaline.com", 
            "password", "Staff@2026"
        );

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
            "password", "Admin@2026"
        );

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
            "password", "Password123"
        );

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
        when(emailService.sendPasswordResetEmail(anyString(), anyString(), anyString())).thenReturn(true);

        Map<String, String> payload = Map.of("email", "user@example.com");

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsStringIgnoringCase("password reset")));

        verify(userRepository, times(1)).save(any(User.class));
        verify(emailService, times(1)).sendPasswordResetEmail(eq("user@example.com"), eq("User Test"), anyString());
    }

    @Test
    void testResetPasswordSuccess() throws Exception {
        User user = new User();
        user.setEmail("user@example.com");
        user.setResetToken("valid-token-123");
        user.setResetTokenExpiry(java.time.LocalDateTime.now().plusHours(1));

        when(userRepository.findByResetToken("valid-token-123")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecret123")).thenReturn("encodedNewSecret");

        Map<String, String> payload = Map.of(
            "token", "valid-token-123",
            "newPassword", "NewSecret123"
        );

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
    void testSyncSupabaseUserNewCustomer() throws Exception {
        Map<String, String> payload = Map.of(
            "email", "googleclient@example.com",
            "fullName", "Google Client",
            "phone", "+919988776655",
            "provider", "google"
        );

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
        verify(auditLogService, times(1)).record(eq("SUPABASE_AUTH_SYNC"), eq("googleclient@example.com"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void testSyncSupabaseUserExistingPendingCustomerActivates() throws Exception {
        Map<String, String> payload = Map.of(
            "email", "pendingclient@example.com",
            "fullName", "Pending Client",
            "provider", "supabase_email_otp"
        );

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

        assertEquals(User.AccountStatus.ACTIVE, existingUser.getStatus(), "Customer status should be updated to ACTIVE upon Supabase sync");
        verify(userRepository, times(1)).save(existingUser);
    }

    @Test
    void testSyncSupabaseUserPreservesAdminStaffRole() throws Exception {
        Map<String, String> payload = Map.of(
            "email", "admin@dermaaline.com",
            "provider", "google"
        );

        User adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@dermaaline.com");
        adminUser.setRole(User.Role.SUPER_ADMIN);
        adminUser.setStatus(User.AccountStatus.ACTIVE);

        when(userRepository.findByEmail("admin@dermaaline.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.save(adminUser)).thenReturn(adminUser);
        when(customerRepository.findByEmail("admin@dermaaline.com")).thenReturn(Optional.of(new Customer()));
        when(jwtTokenProvider.generateToken(any(Authentication.class))).thenReturn("admin-sso-jwt");

        mockMvc.perform(post("/api/auth/sync-supabase-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void testSyncSupabaseUserRejectsDisabledAccount() throws Exception {
        Map<String, String> payload = Map.of(
            "email", "deactivated@example.com",
            "provider", "google"
        );

        User deactivatedUser = new User();
        deactivatedUser.setEmail("deactivated@example.com");
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
    void testSyncPasswordSuccess() throws Exception {
        User user = new User();
        user.setId(55L);
        user.setEmail("user@example.com");
        user.setRole(User.Role.CUSTOMER);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecret2026")).thenReturn("hashedNewSecret2026");

        Map<String, String> payload = Map.of(
            "email", "user@example.com",
            "newPassword", "NewSecret2026"
        );

        mockMvc.perform(post("/api/auth/sync-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("successfully updated")));

        verify(userRepository, times(1)).save(user);
        verify(passwordEncoder, times(1)).encode("NewSecret2026");
    }

    @Test
    void testSyncPasswordRejectsShortPassword() throws Exception {
        Map<String, String> payload = Map.of(
            "email", "user@example.com",
            "newPassword", "123"
        );

        mockMvc.perform(post("/api/auth/sync-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
