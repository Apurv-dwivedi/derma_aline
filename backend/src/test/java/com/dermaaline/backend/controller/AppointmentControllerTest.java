package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AppointmentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private AppointmentController appointmentController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(appointmentController).build();
    }

    @Test
    void testGetAllAppointments() throws Exception {
        Appointment apt = new Appointment();
        apt.setId(10L);
        apt.setCustomerName("Alice Smith");
        apt.setTreatmentName("HydraFacial");
        apt.setStatus("PENDING");

        when(appointmentRepository.findAll()).thenReturn(List.of(apt));

        mockMvc.perform(get("/api/appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerName").value("Alice Smith"))
                .andExpect(jsonPath("$[0].treatmentName").value("HydraFacial"));
    }

    @Test
    void testCreateAppointment() throws Exception {
        Appointment apt = new Appointment();
        apt.setCustomerName("Bob Jones");
        apt.setCustomerEmail("bob@example.com");
        apt.setCustomerPhone("9876543210");
        apt.setTreatmentName("Chemical Peel");
        apt.setAppointmentDate(LocalDateTime.now().plusDays(2));

        Appointment saved = new Appointment();
        saved.setId(101L);
        saved.setCustomerName("Bob Jones");

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(saved);

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(apt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.appointmentId").value(101));

        verify(appointmentRepository, times(1)).save(any(Appointment.class));
    }

    @Test
    void testUpdateAppointmentStatus() throws Exception {
        Appointment apt = new Appointment();
        apt.setId(5L);
        apt.setStatus("PENDING");

        when(appointmentRepository.findById(5L)).thenReturn(Optional.of(apt));

        Map<String, String> payload = Map.of("status", "CONFIRMED");

        mockMvc.perform(patch("/api/appointments/5/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(appointmentRepository, times(1)).save(apt);
    }
}
