package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
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
            String clean = dateStr.trim();
            // Handle ISO string like 2026-11-19T10:00:00 or 2026-11-19T10:00:00.000Z
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
                    appointment.setStatus(newStatus.trim().toUpperCase());
                    Appointment saved = appointmentRepository.save(appointment);
                    if ("COMPLETED".equalsIgnoreCase(saved.getStatus())) {
                        ensureTreatmentRecordCreated(saved, "Derma Aline Specialist");
                    }
                    return ResponseEntity.ok(Map.of("success", true, "message", "Appointment status updated successfully"));
                }
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
            }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Appointment not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error updating appointment status: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAppointment(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            return appointmentRepository.findById(id).map(appointment -> {
                Object pNameObj = payload.getOrDefault("patientName", payload.get("customerName"));
                String patientName = pNameObj != null ? pNameObj.toString() : null;

                Object emailObj = payload.getOrDefault("email", payload.get("customerEmail"));
                String email = emailObj != null ? emailObj.toString() : null;

                Object phoneObj = payload.getOrDefault("phone", payload.get("customerPhone"));
                String phone = phoneObj != null ? phoneObj.toString() : null;

                Object treatmentObj = payload.get("treatmentName");
                String treatmentName = treatmentObj != null ? treatmentObj.toString() : null;

                Object dateObj = payload.get("appointmentDate");
                String dateStr = dateObj != null ? dateObj.toString() : null;

                Object timeObj = payload.get("appointmentTime");
                String timeStr = timeObj != null ? timeObj.toString() : null;

                Object statusObj = payload.get("status");
                String status = statusObj != null ? statusObj.toString() : null;

                Object notesObj = payload.get("notes");
                String notes = notesObj != null ? notesObj.toString() : null;

                if (patientName != null && !patientName.trim().isEmpty()) {
                    appointment.setCustomerName(patientName.trim());
                    appointment.setPatientName(patientName.trim());
                }
                if (email != null && !email.trim().isEmpty()) {
                    appointment.setCustomerEmail(email.trim().toLowerCase());
                    appointment.setEmail(email.trim().toLowerCase());
                }
                if (phone != null) {
                    appointment.setCustomerPhone(phone.trim());
                    appointment.setPhone(phone.trim());
                }
                if (treatmentName != null && !treatmentName.trim().isEmpty()) {
                    appointment.setTreatmentName(treatmentName.trim());
                }
                if (status != null && !status.trim().isEmpty()) {
                    appointment.setStatus(status.trim().toUpperCase());
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
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error updating appointment: " + e.getMessage()));
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
            String email = appointment.getCustomerEmail() != null ? appointment.getCustomerEmail() : appointment.getEmail();
            if (email == null || email.trim().isEmpty()) {
                email = "patient@dermaaline.com";
            }
            String cleanEmail = email.trim().toLowerCase();
            String tName = appointment.getTreatmentName();
            if (tName == null || tName.trim().isEmpty()) {
                tName = "Clinical Treatment";
            }

            LocalDate tDate = appointment.getAppointmentDate() != null 
                ? appointment.getAppointmentDate().toLocalDate() 
                : LocalDate.now();

            List<TreatmentRecord> existing = treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(cleanEmail);
            boolean exists = existing.stream().anyMatch(r -> 
                tName.equalsIgnoreCase(r.getTreatmentName()) && 
                tDate.equals(r.getTreatmentDate())
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
                tr.setTreatmentName(tName);
                tr.setTreatmentDate(tDate);
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
