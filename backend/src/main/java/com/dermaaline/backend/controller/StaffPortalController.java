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

    @GetMapping("/appointments")
    public ResponseEntity<?> getAssignedAppointments(@RequestParam(required = false) String staffName) {
        try {
            List<Appointment> appointments = appointmentRepository.findAll();
            if (staffName != null && !staffName.isEmpty()) {
                appointments = appointments.stream()
                    .filter(a -> staffName.equalsIgnoreCase(a.getId() != null))
                    .toList();
            }
            return ResponseEntity.ok(Map.of("success", true, "data", appointments));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}