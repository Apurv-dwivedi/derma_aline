package com.dermaaline.backend.security;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.securitytest.SecurityTestConfig;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitWebConfig(classes = SecurityTestConfig.class)
@TestPropertySource(properties = {
        "app.jwt.secret=SyntheticIntegrationTestSecretKeyForSpringSecurityFilterChain2026!",
        "app.jwt.expiration-milliseconds=3600000",
        "app.jwt.allow-ephemeral-fallback=false",
        "app.cors.allowed-origins=https://derma-aline.vercel.app"
})
public class SecurityAuthorizationTest {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;
    private String customerToken;
    private String staffToken;
    private String adminToken;
    private String pendingToken;
    private String disabledToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .addFilters(springSecurityFilterChain)
                .build();

        User customer = buildUser("customer@test.com", "Customer", User.Role.CUSTOMER, User.AccountStatus.ACTIVE);
        User staff = buildUser("staff@test.com", "Staff", User.Role.STAFF, User.AccountStatus.ACTIVE);
        User admin = buildUser("admin@test.com", "Admin", User.Role.SUPER_ADMIN, User.AccountStatus.ACTIVE);
        User pending = buildUser("pending@test.com", "Pending", User.Role.CUSTOMER, User.AccountStatus.PENDING_VERIFICATION);
        User disabled = buildUser("disabled@test.com", "Disabled", User.Role.CUSTOMER, User.AccountStatus.DISABLED);

        when(userRepository.findByEmail("customer@test.com")).thenReturn(Optional.of(customer));
        when(userRepository.findByEmail("staff@test.com")).thenReturn(Optional.of(staff));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findByEmail("pending@test.com")).thenReturn(Optional.of(pending));
        when(userRepository.findByEmail("disabled@test.com")).thenReturn(Optional.of(disabled));

        customerToken = jwtTokenProvider.generateToken(new UsernamePasswordAuthenticationToken("customer@test.com", null, Collections.emptyList()));
        staffToken = jwtTokenProvider.generateToken(new UsernamePasswordAuthenticationToken("staff@test.com", null, Collections.emptyList()));
        adminToken = jwtTokenProvider.generateToken(new UsernamePasswordAuthenticationToken("admin@test.com", null, Collections.emptyList()));
        pendingToken = jwtTokenProvider.generateToken(new UsernamePasswordAuthenticationToken("pending@test.com", null, Collections.emptyList()));
        disabledToken = jwtTokenProvider.generateToken(new UsernamePasswordAuthenticationToken("disabled@test.com", null, Collections.emptyList()));
    }

    private User buildUser(String email, String name, User.Role role, User.AccountStatus status) {
        User u = new User();
        u.setEmail(email);
        u.setFullName(name);
        u.setPassword("hashed");
        u.setRole(role);
        u.setStatus(status);
        return u;
    }

    @Test
    void testUnauthenticatedAccessBlockedOnProtectedRoutes() throws Exception {
        mockMvc.perform(get("/api/client/profile")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/staff/customers")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/appointments")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/reports/overview")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/audit-logs")).andExpect(status().isForbidden());
    }

    @Test
    void testPendingAndDisabledUsersCannotAuthenticateWithJwt() throws Exception {
        mockMvc.perform(get("/api/client/profile")
                .header("Authorization", "Bearer " + pendingToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/client/profile")
                .header("Authorization", "Bearer " + disabledToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testCustomerAllowedOnClientPortalButBlockedFromPrivilegeEscalation() throws Exception {
        mockMvc.perform(get("/api/client/profile")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer@test.com"));

        mockMvc.perform(get("/api/staff/customers")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/customers/1")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/audit-logs")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/treatments")
                .header("Authorization", "Bearer " + customerToken)
                .contentType("application/json")
                .content("{\"name\":\"Test\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/system/purge-all-data")
                .param("confirm", "PURGE_ALL_PORTAL_DATA")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testStaffAllowedOperationalAccessButBlockedFromDestructiveDeletesAndAdminRoutes() throws Exception {
        mockMvc.perform(get("/api/customers")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/customers/1")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/appointments/1")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/contact/1")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/reports/overview")
                .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/staff/invitations")
                .header("Authorization", "Bearer " + staffToken)
                .contentType("application/json")
                .content("{\"email\":\"new@test.com\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAdminAuthorizedAndSystemPurgeRequiresExplicitConfirmationToken() throws Exception {
        mockMvc.perform(get("/api/admin/reports/overview")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(delete("/api/admin/system/purge-all-data")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testRevokedJwtWithStaleTokenVersionRejectedAndAuditDeleteBlocked() throws Exception {
        User customer = buildUser("customer@test.com", "Customer", User.Role.CUSTOMER, User.AccountStatus.ACTIVE);
        customer.setTokenVersion(2L);
        when(userRepository.findByEmail("customer@test.com")).thenReturn(Optional.of(customer));

        // Previously issued token (tv=0) must be rejected immediately
        mockMvc.perform(get("/api/client/profile")
                .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        // Fresh token matching current tokenVersion=2 succeeds
        String currentToken = jwtTokenProvider.generateToken(
                new UsernamePasswordAuthenticationToken("customer@test.com", null, Collections.emptyList()), 2L);
        mockMvc.perform(get("/api/client/profile")
                .header("Authorization", "Bearer " + currentToken))
                .andExpect(status().isOk());

        // Audit logs cannot be deleted even by admin
        mockMvc.perform(delete("/api/admin/audit-logs")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
