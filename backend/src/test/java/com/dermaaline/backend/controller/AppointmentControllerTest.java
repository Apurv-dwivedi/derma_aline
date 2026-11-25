package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AppointmentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AppointmentBookingService appointmentBookingService;

    @InjectMocks
    private AppointmentController appointmentController;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

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
        LocalDateTime futureSlot = LocalDateTime.now().plusDays(2).withHour(11).withMinute(0).withSecond(0).withNano(0);
        Map<String, Object> payload = Map.of(
                "customerName", "Bob Jones",
                "customerEmail", "bob@example.com",
                "customerPhone", "9876543210",
                "treatmentName", "Chemical Peel",
                "appointmentDate", futureSlot.toLocalDate().toString(),
                "appointmentTime", "11:00 AM"
        );

        Appointment saved = new Appointment();
        saved.setId(101L);
        saved.setCustomerName("Bob Jones");

        when(appointmentBookingService.createBooking(
                any(), any(), any(), any(), any(), any(), any(), eq(true)))
                .thenReturn(saved);

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.appointmentId").value(101));
    }

    @Test
    void testCreateAppointmentRejectsPastOrInvalidInput() throws Exception {
        when(appointmentBookingService.createBooking(
                any(), any(), any(), any(), any(), any(), any(), eq(true)))
                .thenThrow(new BookingValidationException("Appointments must be scheduled for a future date and time."));

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "patientName", "Bob",
                        "email", "bob@example.com",
                        "phone", "9876543210",
                        "treatmentName", "Chemical Peel",
                        "appointmentDate", "2020-01-01",
                        "appointmentTime", "10:00 AM"
                ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testCreateAppointmentReturnsConflictOnSlotCollision() throws Exception {
        when(appointmentBookingService.createBooking(
                any(), any(), any(), any(), any(), any(), any(), eq(true)))
                .thenThrow(new BookingConflictException("This time slot is fully booked. Please select another available time."));

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "patientName", "Bob",
                        "email", "bob@example.com",
                        "phone", "9876543210",
                        "treatmentName", "Chemical Peel",
                        "appointmentDate", "2027-01-15",
                        "appointmentTime", "10:00 AM"
                ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testUpdateAppointmentStatus() throws Exception {
        Appointment updated = new Appointment();
        updated.setId(5L);
        updated.setStatus("CONFIRMED");

        when(appointmentBookingService.transitionStatus(5L, "CONFIRMED", "Derma Aline Specialist")).thenReturn(updated);

        mockMvc.perform(patch("/api/appointments/5/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testUpdateAppointmentStatusRejectsInvalidTransition() throws Exception {
        when(appointmentBookingService.transitionStatus(5L, "PENDING", "Derma Aline Specialist"))
                .thenThrow(new BookingConflictException("Cannot transition appointment from COMPLETED to PENDING."));

        mockMvc.perform(patch("/api/appointments/5/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "PENDING"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }
}
