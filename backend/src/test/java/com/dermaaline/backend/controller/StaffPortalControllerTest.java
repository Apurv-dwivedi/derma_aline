package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.NotificationRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class StaffPortalControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AppointmentBookingService appointmentBookingService;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private TreatmentRecordRepository treatmentRecordRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StaffPortalController staffPortalController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(staffPortalController).build();
    }

    @Test
    void testGetStaffAppointments() throws Exception {
        Appointment a1 = new Appointment();
        a1.setId(10L);
        a1.setCustomerName("Maria Garcia");
        a1.setTreatmentName("HydraFacial Glow");
        a1.setStatus("PENDING");

        when(appointmentRepository.findAll()).thenReturn(List.of(a1));

        mockMvc.perform(get("/api/staff/appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].customerName").value("Maria Garcia"))
                .andExpect(jsonPath("$[0].treatmentName").value("HydraFacial Glow"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        verify(appointmentRepository, times(1)).findAll();
    }

    @Test
    void testUpdateStaffAppointmentStatus() throws Exception {
        Appointment a1 = new Appointment();
        a1.setId(15L);
        a1.setStatus("COMPLETED");

        when(appointmentBookingService.transitionStatus(eq(15L), eq("COMPLETED"), anyString())).thenReturn(a1);

        Map<String, String> payload = Map.of("status", "COMPLETED");

        mockMvc.perform(patch("/api/staff/appointments/15/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("COMPLETED")));
    }
}
