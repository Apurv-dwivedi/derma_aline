package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    // Get all appointments (Shared global queue for Admin and Staff)
    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        return ResponseEntity.ok(appointments);
    }

    // Create a new appointment from the public booking form
    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Appointment appointment) {
        try {
            Appointment savedAppointment = appointmentRepository.save(appointment);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment booked successfully!",
                "appointmentId", savedAppointment.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Failed to book appointment: " + e.getMessage()
            ));
        }
    }

    // Update appointment status (e.g., Confirmed, Completed, Cancelled)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return appointmentRepository.findById(id).map(appointment -> {
            String newStatus = payload.get("status");
            if (newStatus != null) {
                appointment.setStatus(newStatus);
                appointmentRepository.save(appointment);
                return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
    }
}