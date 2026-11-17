package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.entity.ContactStatus;
import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Operational Clinic Analytics (Excludes all financial/revenue records per clinic specifications)
     */
    @GetMapping("/overview")
    public ResponseEntity<?> getOverviewReports() {
        try {
            long totalCustomers = customerRepository.count();
            long totalTreatmentsRecorded = treatmentRecordRepository.count();
            long totalActiveServices = treatmentRepository.count();
            long totalStaff = userRepository.findAll().stream().filter(u -> u.getRole().name().equals("STAFF")).count();

            List<TreatmentRecord> allRecords = treatmentRecordRepository.findAll();
            Map<String, Long> treatmentCounts = new HashMap<>();
            for (TreatmentRecord tr : allRecords) {
                String tName = tr.getTreatmentName() != null ? tr.getTreatmentName().trim() : "General Consultation";
                treatmentCounts.put(tName, treatmentCounts.getOrDefault(tName, 0L) + 1);
            }

            List<ContactMessage> enquiries = contactRepository.findAll();
            long unreadEnquiries = enquiries.stream().filter(e -> e.getStatus() == ContactStatus.UNREAD).count();
            long resolvedEnquiries = enquiries.stream().filter(e -> e.getStatus() == ContactStatus.RESOLVED || e.getStatus() == ContactStatus.READ).count();

            Map<String, Object> report = new HashMap<>();
            report.put("success", true);
            report.put("totalCustomers", totalCustomers);
            report.put("totalTreatmentsRecorded", totalTreatmentsRecorded);
            report.put("totalActiveServices", totalActiveServices);
            report.put("totalStaff", totalStaff);
            report.put("treatmentCounts", treatmentCounts);
            report.put("totalEnquiries", enquiries.size());
            report.put("unreadEnquiries", unreadEnquiries);
            report.put("resolvedEnquiries", resolvedEnquiries);

            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to compile operational report: " + e.getMessage()));
        }
    }
}
