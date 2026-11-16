package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
    public ResponseEntity<?> getOverviewReports() {
        try {
            List<Appointment> appointments = appointmentRepository.findAll();
            List<Treatment> treatments = treatmentRepository.findAll();

            // Map treatment names to prices
            Map<String, Double> priceMap = new HashMap<>();
            for (Treatment t : treatments) {
                if (t.getName() != null && t.getPrice() != null) {
                    priceMap.put(t.getName().trim().toLowerCase(), t.getPrice());
                }
            }

            long totalAppointments = appointments.size();
            long pendingAppointments = 0;
            long confirmedAppointments = 0;
            long completedAppointments = 0;
            long cancelledAppointments = 0;

            double completedRevenue = 0.0;
            double projectedRevenue = 0.0;

            Map<String, Long> treatmentCounts = new HashMap<>();

            for (Appointment a : appointments) {
                String status = a.getStatus() != null ? a.getStatus().toUpperCase() : "PENDING";
                String tName = a.getTreatmentName() != null ? a.getTreatmentName().trim() : "General Consultation";
                Double price = priceMap.getOrDefault(tName.toLowerCase(), 3500.0);

                treatmentCounts.put(tName, treatmentCounts.getOrDefault(tName, 0L) + 1);

                switch (status) {
                    case "COMPLETED":
                        completedAppointments++;
                        completedRevenue += price;
                        break;
                    case "CONFIRMED":
                        confirmedAppointments++;
                        projectedRevenue += price;
                        break;
                    case "CANCELLED":
                        cancelledAppointments++;
                        break;
                    default:
                        pendingAppointments++;
                        break;
                }
            }

            double totalEstimatedValue = completedRevenue + projectedRevenue;
            double avgBookingValue = (completedAppointments + confirmedAppointments) > 0 
                    ? totalEstimatedValue / (completedAppointments + confirmedAppointments) 
                    : 0.0;

            long totalCustomers = customerRepository.count();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "totalAppointments", totalAppointments,
                "pendingAppointments", pendingAppointments,
                "confirmedAppointments", confirmedAppointments,
                "completedAppointments", completedAppointments,
                "cancelledAppointments", cancelledAppointments,
                "completedRevenue", completedRevenue,
                "projectedRevenue", projectedRevenue,
                "totalEstimatedValue", totalEstimatedValue,
                "averageBookingValue", Math.round(avgBookingValue),
                "totalCustomers", totalCustomers,
                "treatmentCounts", treatmentCounts
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Failed to load reports: " + e.getMessage()
            ));
        }
    }
}
