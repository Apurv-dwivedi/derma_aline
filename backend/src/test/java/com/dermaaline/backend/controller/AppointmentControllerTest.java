package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.service.EmailService;
import derma_aline.BackendApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

// Explicitly pointing to the main configuration class to fix the IllegalStateException
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
public class AppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AppointmentRepository appointmentRepository;

    @MockBean
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        // Assume no duplicate bookings by default
        Mockito.when(appointmentRepository.existsByAppointmentDateAndStartTimeAndTreatmentName(
                any(LocalDate.class), any(String.class), any(String.class)
        )).thenReturn(false);

        Mockito.when(appointmentRepository.save(any(Appointment.class))).thenAnswer(i -> i.getArguments()[0]);
    }

    @Test
    public void testSuccessfulBooking() throws Exception {
        String appointmentJson = """
                {
                    "patientName": "Test Patient",
                    "email": "test@example.com",
                    "phone": "1234567890",
                    "treatmentName": "Laser Hair Reduction",
                    "appointmentDate": "2026-12-01",
                    "appointmentTime": "14:00"
                }
                """;

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(appointmentJson))
                .andExpect(status().isCreated());
    }

    @Test
    public void testDoubleBookingConflict() throws Exception {
        // Force the mock to simulate an existing booking
        Mockito.when(appointmentRepository.existsByAppointmentDateAndStartTimeAndTreatmentName(
                any(LocalDate.class), any(String.class), any(String.class)
        )).thenReturn(true);

        String appointmentJson = """
                {
                    "patientName": "Test Patient",
                    "email": "test@example.com",
                    "phone": "1234567890",
                    "treatmentName": "Laser Hair Reduction",
                    "appointmentDate": "2026-12-01",
                    "appointmentTime": "14:00"
                }
                """;

        mockMvc.perform(post("/api/appointments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(appointmentJson))
                .andExpect(status().isConflict())
                .andExpect(content().string("This time slot is already booked for this treatment. Please select another time."));
    }
}