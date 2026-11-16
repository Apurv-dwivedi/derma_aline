package com.dermaaline.backend.controller;

import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping("/overview")
    public ResponseEntity<?> getOverviewReports() {
        try {
            long totalAppointments = appointmentRepository.count();
            long pendingAppointments = appointmentRepository.findAll().stream()
                    .filter(a -> "PENDING".equalsIgnoreCase(a.getStatus()))
                    .count();
            long confirmedAppointments = appointmentRepository.findAll().stream()
                    .filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus()))
                    .count();
            long completedAppointments = appointmentRepository.findAll().stream()
                    .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                    .count();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "totalAppointments", totalAppointments,
                "pendingAppointments", pendingAppointments,
                "confirmedAppointments", confirmedAppointments,
                "completedAppointments", completedAppointments
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Failed to load reports: " + e.getMessage()
            ));
        }
    }
}