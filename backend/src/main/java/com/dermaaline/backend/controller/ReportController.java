package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TreatmentRepository treatmentRepository;

    @GetMapping("/overview")
    public ResponseEntity<?> getDashboardOverview() {
        try {
            List<Appointment> allAppointments = appointmentRepository.findAll();
            LocalDate today = LocalDate.now();

            long totalAppointments = allAppointments.size();
            long todaysAppointments = allAppointments.stream()
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().equals(today))
                .count();

            long pendingAppointments = allAppointments.stream()
                .filter(a -> a.getStatus() == Appointment.AppointmentStatus.PENDING)
                .count();

            long confirmedAppointments = allAppointments.stream()
                .filter(a -> a.getStatus() == Appointment.AppointmentStatus.CONFIRMED)
                .count();

            long completedAppointments = allAppointments.stream()
                .filter(a -> a.getStatus() == Appointment.AppointmentStatus.COMPLETED)
                .count();

            long totalCustomers = customerRepository.count();
            long totalTreatments = treatmentRepository.count();

            Map<String, Object> stats = Map.of(
                "totalAppointments", totalAppointments,
                "todaysAppointments", todaysAppointments,
                "pendingAppointments", pendingAppointments,
                "confirmedAppointments", confirmedAppointments,
                "completedAppointments", completedAppointments,
                "totalCustomers", totalCustomers,
                "totalTreatments", totalTreatments
            );

            return ResponseEntity.ok(Map.of("success", true, "data", stats));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}