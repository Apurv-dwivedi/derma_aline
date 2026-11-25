package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.EmailVerificationOtpRepository;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.service.AuditLogService;
import com.dermaaline.backend.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class StaffManagementControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private StaffInvitationRepository staffInvitationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationOtpRepository emailVerificationOtpRepository;

    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private StaffManagementController staffManagementController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(staffManagementController, "frontendUrl", "https://derma-aline.vercel.app");
        mockMvc = MockMvcBuilders.standaloneSetup(staffManagementController).build();
    }

    @Test
    void testSendStaffInvitationUsesSingleUseTokenAndNeverExposesOrEmailsPasswords() throws Exception {
        when(userRepository.findByEmail("therapist@dermaaline.com")).thenReturn(Optional.empty());
        when(staffInvitationRepository.findByEmail("therapist@dermaaline.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(staffInvitationRepository.save(any(StaffInvitation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendEmail(eq("therapist@dermaaline.com"), anyString(), anyString())).thenReturn(true);

        mockMvc.perform(post("/api/admin/staff/invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "fullName", "Priya Sharma",
                        "email", "therapist@dermaaline.com",
                        "designation", "Senior Aesthetician",
                        "phone", "+919876543210",
                        "password", "AttemptedPlaintextPass"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("INVITED"))
                .andExpect(jsonPath("$.initialPassword").doesNotExist());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(User.AccountStatus.PENDING_VERIFICATION, userCaptor.getValue().getStatus());
        assertFalse(passwordEncoder.matches("AttemptedPlaintextPass", userCaptor.getValue().getPassword()),
                "Client-supplied plaintext passwords must be ignored during invite onboarding");

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("therapist@dermaaline.com"), anyString(), bodyCaptor.capture());
        String emailBody = bodyCaptor.getValue();
        assertTrue(emailBody.contains("/staff/activate?token="));
        assertFalse(emailBody.contains("Initial Password"));
        assertFalse(emailBody.contains("AttemptedPlaintextPass"));

        verify(auditLogService, times(1)).record(eq("STAFF_INVITED"), anyString(), eq("ADMIN"),
                eq("STAFF_INVITATION"), eq("therapist@dermaaline.com"), anyString());
    }

    @Test
    void testSendStaffInvitationReturns503WhenEmailDeliveryFails() throws Exception {
        when(userRepository.findByEmail("fail@dermaaline.com")).thenReturn(Optional.empty());
        when(staffInvitationRepository.findByEmail("fail@dermaaline.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(staffInvitationRepository.save(any(StaffInvitation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendEmail(eq("fail@dermaaline.com"), anyString(), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/admin/staff/invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "fullName", "Fail Case",
                        "email", "fail@dermaaline.com"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.inviteSaved").value(true))
                .andExpect(jsonPath("$.message", containsString("could not be delivered")));
    }

    @Test
    void testDisableStaffMemberIncrementsTokenVersionAndAudits() throws Exception {
        User staff = new User();
        staff.setId(88L);
        staff.setEmail("active.staff@dermaaline.com");
        staff.setFullName("Active Staff");
        staff.setRole(User.Role.STAFF);
        staff.setStatus(User.AccountStatus.ACTIVE);
        staff.setTokenVersion(0L);

        when(userRepository.findById(88L)).thenReturn(Optional.of(staff));
        when(staffInvitationRepository.findByEmail("active.staff@dermaaline.com")).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/admin/staff/members/88/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "DISABLED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("DISABLED"));

        assertEquals(User.AccountStatus.DISABLED, staff.getStatus());
        assertEquals(1L, staff.getTokenVersion(), "Disabling staff must revoke active JWT tokens via tokenVersion increment");
        verify(auditLogService).record(eq("STAFF_STATUS_CHANGED"), anyString(), eq("ADMIN"),
                eq("USER"), eq("active.staff@dermaaline.com"), anyString());
    }

    @Test
    void testResetInviteRotatesTokenVersionAndNeverEmailsPasswords() throws Exception {
        User staff = new User();
        staff.setId(89L);
        staff.setEmail("reset.staff@dermaaline.com");
        staff.setFullName("Reset Staff");
        staff.setRole(User.Role.STAFF);
        staff.setStatus(User.AccountStatus.ACTIVE);
        staff.setTokenVersion(1L);

        when(userRepository.findById(89L)).thenReturn(Optional.of(staff));
        when(staffInvitationRepository.findByEmail("reset.staff@dermaaline.com")).thenReturn(Optional.empty());
        when(staffInvitationRepository.save(any(StaffInvitation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendEmail(eq("reset.staff@dermaaline.com"), anyString(), anyString())).thenReturn(true);

        mockMvc.perform(post("/api/admin/staff/members/89/reset-invite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertEquals(2L, staff.getTokenVersion());
        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("reset.staff@dermaaline.com"), anyString(), bodyCaptor.capture());
        assertTrue(bodyCaptor.getValue().contains("/staff/activate?token="));
        assertFalse(bodyCaptor.getValue().toLowerCase().contains("updated password"));
    }
}
