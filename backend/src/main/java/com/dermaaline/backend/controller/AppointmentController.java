package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        return ResponseEntity.ok(appointments);
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Map<String, Object> payload) {
        try {
            String patientName = (String) payload.getOrDefault("patientName", payload.get("customerName"));
            String email = (String) payload.getOrDefault("email", payload.get("customerEmail"));
            String phone = (String) payload.getOrDefault("phone", payload.get("customerPhone"));
            String treatmentName = (String) payload.get("treatmentName");
            String dateStr = (String) payload.get("appointmentDate");
            String timeStr = (String) payload.getOrDefault("appointmentTime", "10:00");
            String notes = (String) payload.get("notes");

            if (patientName == null || patientName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Patient name is required."));
            }
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required."));
            }
            if (treatmentName == null || treatmentName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment selection is required."));
            }

            Appointment appt = new Appointment();
            appt.setCustomerName(patientName.trim());
            appt.setPatientName(patientName.trim());
            appt.setCustomerEmail(email.trim().toLowerCase());
            appt.setEmail(email.trim().toLowerCase());
            appt.setCustomerPhone(phone != null ? phone.trim() : "");
            appt.setPhone(phone != null ? phone.trim() : "");
            appt.setTreatmentName(treatmentName.trim());
            appt.setAppointmentTime(timeStr);
            appt.setNotes(notes);
            appt.setStatus("PENDING");

            // Parse date & time safely
            LocalDateTime appointmentDateTime = parseAppointmentDate(dateStr, timeStr);
            appt.setAppointmentDate(appointmentDateTime);

            Appointment saved = appointmentRepository.save(appt);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment booked successfully!",
                "appointmentId", saved.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Failed to book appointment: " + e.getMessage()
            ));
        }
    }

    private LocalDateTime parseAppointmentDate(String dateStr, String timeStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDateTime.now().plusDays(1);
        }
        try {
            if (dateStr.contains("T")) {
                return LocalDateTime.parse(dateStr.trim());
            }
            LocalDate date = LocalDate.parse(dateStr.trim());
            LocalTime time = LocalTime.of(10, 0);
            if (timeStr != null && timeStr.trim().matches("\\d{1,2}:\\d{2}")) {
                time = LocalTime.parse(timeStr.trim());
            }
            return LocalDateTime.of(date, time);
        } catch (Exception e) {
            return LocalDateTime.now().plusDays(1);
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return appointmentRepository.findById(id).map(appointment -> {
            String newStatus = payload.get("status");
            if (newStatus != null) {
                appointment.setStatus(newStatus.toUpperCase());
                appointmentRepository.save(appointment);
                return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
    }
}
