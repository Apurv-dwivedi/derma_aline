package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        List<Appointment> appointments = appointmentRepository.findAll();
        return ResponseEntity.ok(appointments);
    }

    /**
     * Authenticated client appointments lookup endpoint
     */
    @GetMapping("/my")
    public ResponseEntity<List<Appointment>> getMyAppointments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        String email = auth.getName().trim().toLowerCase();
        List<Appointment> appointments = appointmentRepository
                .findByCustomerEmailIgnoreCaseOrEmailIgnoreCaseOrderByAppointmentDateDesc(email, email);
        return ResponseEntity.ok(appointments);
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Map<String, Object> payload) {
        try {
            if (payload == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body cannot be empty."));
            }

            Object pNameObj = payload.getOrDefault("patientName", payload.get("customerName"));
            String rawPatientName = pNameObj != null ? pNameObj.toString() : null;

            Object emailObj = payload.getOrDefault("email", payload.get("customerEmail"));
            String rawEmail = emailObj != null ? emailObj.toString() : null;

            Object phoneObj = payload.getOrDefault("phone", payload.get("customerPhone"));
            String rawPhone = phoneObj != null ? phoneObj.toString() : null;

            Object treatmentObj = payload.get("treatmentName");
            String rawTreatmentName = treatmentObj != null ? treatmentObj.toString() : null;

            String dateStr = (String) payload.get("appointmentDate");
            String timeStr = (String) payload.getOrDefault("appointmentTime", "10:00");
            
            Object notesObj = payload.get("notes");
            String rawNotes = notesObj != null ? notesObj.toString() : "";

            // Strict sanitization against XSS & injections
            String patientName = SecuritySanitizer.sanitizeText(rawPatientName, 100);
            String email = SecuritySanitizer.sanitizeEmail(rawEmail);
            String phone = SecuritySanitizer.sanitizePhone(rawPhone);
            String treatmentName = SecuritySanitizer.sanitizeText(rawTreatmentName, 150);
            String notes = SecuritySanitizer.sanitizeText(rawNotes, 1000);

            if (patientName == null || patientName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Patient name is required."));
            }
            if (email == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid email is required."));
            }
            if (treatmentName == null || treatmentName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment selection is required."));
            }

            Appointment appt = new Appointment();
            appt.setCustomerName(patientName);
            appt.setPatientName(patientName);
            appt.setCustomerEmail(email);
            appt.setEmail(email);
            appt.setCustomerPhone(phone != null ? phone : "");
            appt.setPhone(phone != null ? phone : "");
            appt.setTreatmentName(treatmentName);
            appt.setAppointmentTime(timeStr != null ? SecuritySanitizer.sanitizeText(timeStr, 20) : "10:00");
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
                "message", "Failed to book appointment."
            ));
        }
    }

    private LocalDateTime parseAppointmentDate(String dateStr, String timeStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDateTime.now().plusDays(1);
        }
        try {
            String clean = dateStr.trim();
            if (clean.contains("T")) {
                String isoClean = clean.replace("Z", "");
                if (isoClean.contains(".")) {
                    isoClean = isoClean.substring(0, isoClean.indexOf('.'));
                }
                try {
                    return LocalDateTime.parse(isoClean);
                } catch (Exception ignored) {}
            }

            if (clean.length() >= 10 && clean.contains("-")) {
                LocalDate date = LocalDate.parse(clean.substring(0, 10));
                LocalTime time = LocalTime.of(10, 0);
                if (timeStr != null && !timeStr.trim().isEmpty()) {
                    String cleanTime = timeStr.trim();
                    if (cleanTime.matches("\\d{1,2}:\\d{2}:\\d{2}")) {
                        time = LocalTime.parse(cleanTime.substring(0, 5));
                    } else if (cleanTime.matches("\\d{1,2}:\\d{2}")) {
                        time = LocalTime.parse(cleanTime);
                    }
                }
                return LocalDateTime.of(date, time);
            }
            return LocalDateTime.now().plusDays(1);
        } catch (Exception e) {
            return LocalDateTime.now().plusDays(1);
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            return appointmentRepository.findById(id).map(appointment -> {
                String newStatus = payload.get("status");
                if (newStatus != null && !newStatus.trim().isEmpty()) {
                    String sanitizedStatus = SecuritySanitizer.sanitizeText(newStatus, 30);
                    appointment.setStatus(sanitizedStatus.toUpperCase());
                    Appointment saved = appointmentRepository.save(appointment);
                    if ("COMPLETED".equalsIgnoreCase(saved.getStatus())) {
                        ensureTreatmentRecordCreated(saved, "Derma Aline Specialist");
                    }
                    return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
                }
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
            }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error updating appointment status."));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAppointment(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            return appointmentRepository.findById(id).map(appointment -> {
                Object pNameObj = payload.getOrDefault("patientName", payload.get("customerName"));
                String patientName = pNameObj != null ? SecuritySanitizer.sanitizeText(pNameObj.toString(), 100) : null;

                Object emailObj = payload.getOrDefault("email", payload.get("customerEmail"));
                String email = emailObj != null ? SecuritySanitizer.sanitizeEmail(emailObj.toString()) : null;

                Object phoneObj = payload.getOrDefault("phone", payload.get("customerPhone"));
                String phone = phoneObj != null ? SecuritySanitizer.sanitizePhone(phoneObj.toString()) : null;

                Object treatmentObj = payload.get("treatmentName");
                String treatmentName = treatmentObj != null ? SecuritySanitizer.sanitizeText(treatmentObj.toString(), 150) : null;

                Object dateObj = payload.get("appointmentDate");
                String dateStr = dateObj != null ? dateObj.toString() : null;

                Object timeObj = payload.get("appointmentTime");
                String timeStr = timeObj != null ? SecuritySanitizer.sanitizeText(timeObj.toString(), 20) : null;

                Object statusObj = payload.get("status");
                String status = statusObj != null ? SecuritySanitizer.sanitizeText(statusObj.toString(), 30) : null;

                Object notesObj = payload.get("notes");
                String notes = notesObj != null ? SecuritySanitizer.sanitizeText(notesObj.toString(), 1000) : null;

                if (patientName != null && !patientName.isEmpty()) {
                    appointment.setCustomerName(patientName);
                    appointment.setPatientName(patientName);
                }
                if (email != null) {
                    appointment.setCustomerEmail(email);
                    appointment.setEmail(email);
                }
                if (phone != null) {
                    appointment.setCustomerPhone(phone);
                    appointment.setPhone(phone);
                }
                if (treatmentName != null && !treatmentName.isEmpty()) {
                    appointment.setTreatmentName(treatmentName);
                }
                if (status != null && !status.isEmpty()) {
                    appointment.setStatus(status.toUpperCase());
                }
                if (timeStr != null) {
                    appointment.setAppointmentTime(timeStr);
                }
                if (notes != null) {
                    appointment.setNotes(notes);
                }
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    appointment.setAppointmentDate(parseAppointmentDate(dateStr, timeStr));
                }

                Appointment saved = appointmentRepository.save(appointment);
                if ("COMPLETED".equalsIgnoreCase(saved.getStatus())) {
                    ensureTreatmentRecordCreated(saved, "Derma Aline Specialist");
                }
                return ResponseEntity.ok(Map.of("success", true, "message", "Appointment updated successfully"));
            }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error updating appointment."));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id) {
        return appointmentRepository.findById(id).map(appointment -> {
            appointmentRepository.delete(appointment);
            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment deleted successfully"));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
    }

    private void ensureTreatmentRecordCreated(Appointment appointment, String practitioner) {
        if (appointment == null || !"COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            return;
        }
        try {
            final String rawEmail = appointment.getCustomerEmail() != null ? appointment.getCustomerEmail() : appointment.getEmail();
            final String cleanEmail = (rawEmail != null && !rawEmail.trim().isEmpty()) 
                ? rawEmail.trim().toLowerCase() 
                : "patient@dermaaline.com";

            final String finalTreatmentName = (appointment.getTreatmentName() != null && !appointment.getTreatmentName().trim().isEmpty())
                ? appointment.getTreatmentName().trim()
                : "Clinical Treatment";

            final LocalDate finalTreatmentDate = appointment.getAppointmentDate() != null 
                ? appointment.getAppointmentDate().toLocalDate() 
                : LocalDate.now();

            List<TreatmentRecord> existing = treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(cleanEmail);
            boolean exists = existing.stream().anyMatch(r -> 
                finalTreatmentName.equalsIgnoreCase(r.getTreatmentName()) && 
                finalTreatmentDate.equals(r.getTreatmentDate())
            );

            if (!exists) {
                Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
                Customer customer;
                if (customerOpt.isEmpty()) {
                    customer = new Customer();
                    customer.setEmail(cleanEmail);
                    customer.setFullName(appointment.getCustomerName() != null ? appointment.getCustomerName() : "Valued Client");
                    customer.setPhone(appointment.getCustomerPhone());
                    customer = customerRepository.save(customer);
                } else {
                    customer = customerOpt.get();
                }

                TreatmentRecord tr = new TreatmentRecord();
                tr.setCustomerId(customer.getId());
                tr.setCustomerEmail(cleanEmail);
                tr.setCustomerName(customer.getFullName() != null ? customer.getFullName() : "Valued Client");
                tr.setTreatmentName(finalTreatmentName);
                tr.setTreatmentDate(finalTreatmentDate);
                tr.setPractitionerName(practitioner != null ? practitioner : "Derma Aline Specialist");
                tr.setDescription("Clinical appointment completed.");
                tr.setClinicalNotes(appointment.getNotes() != null && !appointment.getNotes().trim().isEmpty() 
                    ? appointment.getNotes() 
                    : "Clinical appointment procedure completed successfully.");
                tr.setAftercareInstructions("Keep the treated area clean, hydrated, and protected with broad-spectrum SPF 50+ sunscreen daily.");
                treatmentRecordRepository.save(tr);
            }
        } catch (Exception ignored) {}
    }
}
