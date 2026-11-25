package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.Notification;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.NotificationRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AppointmentBookingService.ForbiddenAppointmentAccessException;
import com.dermaaline.backend.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class ClientPortalControllerTest {

    private MockMvc mockMvc;

    @Mock private UserRepository userRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private TreatmentRecordRepository treatmentRecordRepository;
    @Mock private ContactRepository contactRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private AppointmentBookingService appointmentBookingService;
    @Mock private AuditLogService auditLogService;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ClientPortalController clientPortalController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(clientPortalController).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "client.a@example.com",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
                )
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testCancelAppointmentSuccessForOwner() throws Exception {
        Appointment cancelled = new Appointment();
        cancelled.setId(44L);
        cancelled.setCustomerEmail("client.a@example.com");
        cancelled.setTreatmentName("HydraFacial Glow");
        cancelled.setAppointmentDate(LocalDateTime.now().plusDays(3));
        cancelled.setStatus("CANCELLED");

        when(appointmentBookingService.cancelCustomerAppointment(44L, "client.a@example.com")).thenReturn(cancelled);

        mockMvc.perform(patch("/api/client/appointments/44/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.appointment.status").value("CANCELLED"));
    }

    @Test
    void testCancelAppointmentIdorAttemptForbidden() throws Exception {
        when(appointmentBookingService.cancelCustomerAppointment(99L, "client.a@example.com"))
                .thenThrow(new ForbiddenAppointmentAccessException("You are not authorized to cancel another client's appointment."));

        mockMvc.perform(patch("/api/client/appointments/99/cancel"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testNotificationIdorAttemptForbidden() throws Exception {
        Notification otherNotif = new Notification();
        otherNotif.setId(77L);
        otherNotif.setRecipientEmail("victim.b@example.com");

        when(notificationRepository.findById(77L)).thenReturn(Optional.of(otherNotif));

        mockMvc.perform(patch("/api/client/notifications/77/read"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void testUpdateProfileRejectsUnsafeJavascriptImageUrl() throws Exception {
        User client = new User();
        client.setEmail("client.a@example.com");
        client.setFullName("Client A");

        when(userRepository.findByEmail("client.a@example.com")).thenReturn(Optional.of(client));

        mockMvc.perform(put("/api/client/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "fullName", "Client A",
                        "profilePicture", "javascript:alert(document.cookie)"
                ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(userRepository, never()).save(any());
    }
}
