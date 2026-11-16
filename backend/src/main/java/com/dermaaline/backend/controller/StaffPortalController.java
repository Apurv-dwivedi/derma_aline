package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*")
public class StaffPortalController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    /**
     * Staff Queue View:
     * Salon workers can view active appointments, customer contact, treatment, and status,
     * but have no access to sensitive customer notes, financial reports, or user management.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Appointment>> getStaffAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        return ResponseEntity.ok(appointments);
    }

    /**
     * Staff CTA action:
     * Allows staff workers to update status (e.g. CONFIRMED, COMPLETED, CANCELLED)
     */
    @PatchMapping("/appointments/{id}/status")
    public ResponseEntity<?> updateStaffAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
        }

        return appointmentRepository.findById(id).map(appointment -> {
            appointment.setStatus(newStatus.trim().toUpperCase());
            appointmentRepository.save(appointment);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment status updated to " + appointment.getStatus()
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
    }
}
