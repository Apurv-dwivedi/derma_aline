package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.*;
import com.dermaaline.backend.repository.*;
import com.dermaaline.backend.security.SecuritySanitizer;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AppointmentBookingService.AppointmentNotFoundException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/staff")
@PreAuthorize("hasAnyRole('STAFF', 'SUPER_ADMIN', 'ADMIN')")
public class StaffPortalController {

    private static final Logger logger = LoggerFactory.getLogger(StaffPortalController.class);

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AppointmentBookingService appointmentBookingService;

    @Autowired
    private UserRepository userRepository;

    private String getStaffEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated()) ? auth.getName().trim().toLowerCase() : "staff@dermaaline.com";
    }

    /**
     * Generalist Staff Dashboard Operational Summary
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getStaffDashboard() {
        long totalCustomers = customerRepository.count();
        long totalTreatments = treatmentRecordRepository.count();
        List<ContactMessage> enquiries = contactRepository.findAll();
        long unreadEnquiries = enquiries.stream()
                .filter(m -> m.getStatus() == ContactStatus.UNREAD)
                .count();

        List<TreatmentRecord> recentTreatments = treatmentRecordRepository.findAllByOrderByTreatmentDateDesc();
        if (recentTreatments.size() > 5) {
            recentTreatments = recentTreatments.subList(0, 5);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("totalCustomers", totalCustomers);
        data.put("totalTreatmentsRecorded", totalTreatments);
        data.put("unreadEnquiries", unreadEnquiries);
        data.put("recentTreatments", recentTreatments);

        return ResponseEntity.ok(data);
    }

    /**
     * Customer CRM: GET /api/staff/customers
     */
    @GetMapping("/customers")
    public ResponseEntity<List<Customer>> getCustomers(@RequestParam(required = false) String search) {
        List<Customer> customers = customerRepository.findAll();
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            customers = customers.stream()
                    .filter(c -> (c.getFullName() != null && c.getFullName().toLowerCase().contains(q)) ||
                                 (c.getEmail() != null && c.getEmail().toLowerCase().contains(q)) ||
                                 (c.getPhone() != null && c.getPhone().contains(q)))
                    .toList();
        }
        return ResponseEntity.ok(customers);
    }

    /**
     * Customer CRM: POST /api/staff/customers
     */
    @PostMapping("/customers")
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        if (customer == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Client details are required."));
        }
        String cleanName = SecuritySanitizer.sanitizeText(customer.getFullName(), 100);
        String cleanEmail = SecuritySanitizer.sanitizeEmail(customer.getEmail());
        if (cleanName == null || cleanName.isEmpty() || cleanEmail == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid full name and email are required."));
        }

        if (customerRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A client record with this email already exists."));
        }

        if (customer.getPhone() != null && !customer.getPhone().trim().isEmpty()) {
            String cleanPhone = SecuritySanitizer.sanitizePhone(customer.getPhone());
            if (cleanPhone == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid phone number format."));
            }
            customer.setPhone(cleanPhone);
        }
        if (customer.getNotes() != null) {
            customer.setNotes(SecuritySanitizer.sanitizeText(customer.getNotes(), 2000));
        }
        if (customer.getProfilePicture() != null) {
            String safeImg = SecuritySanitizer.sanitizeImageUrl(customer.getProfilePicture(), 500_000);
            customer.setProfilePicture(safeImg != null && !safeImg.isEmpty() ? safeImg : null);
        }

        customer.setFullName(cleanName);
        customer.setEmail(cleanEmail);
        Customer saved = customerRepository.save(customer);
        return ResponseEntity.ok(Map.of("success", true, "message", "Client profile created.", "customer", saved));
    }

    /**
     * Clinical Treatment Records: GET /api/staff/treatments/records
     */
    @GetMapping("/treatments/records")
    public ResponseEntity<List<TreatmentRecord>> getTreatmentRecords() {
        // Automatically backfill and sync any completed visits into clinical treatment records
        syncCompletedAppointments();
        return ResponseEntity.ok(treatmentRecordRepository.findAllByOrderByTreatmentDateDesc());
    }

    /**
     * Clinical Treatment Records: POST /api/staff/treatments/records
     * Authorized staff member logs a treatment performed for a client.
     */
    @PostMapping("/treatments/records")
    public ResponseEntity<?> recordTreatment(@RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment record payload is required."));
        }
        try {
            String rawEmail = payload.get("customerEmail") != null ? payload.get("customerEmail").toString() : null;
            String rawTreatment = payload.get("treatmentName") != null ? payload.get("treatmentName").toString() : null;
            String dateStr = payload.get("treatmentDate") != null ? payload.get("treatmentDate").toString() : null;
            String rawDescription = payload.get("description") != null ? payload.get("description").toString() : null;
            String rawClinicalNotes = payload.get("clinicalNotes") != null ? payload.get("clinicalNotes").toString() : null;
            String rawAftercare = payload.get("aftercareInstructions") != null ? payload.get("aftercareInstructions").toString() : null;

            String cleanEmail = SecuritySanitizer.sanitizeEmail(rawEmail);
            String treatmentName = SecuritySanitizer.sanitizeText(rawTreatment, 150);
            if (cleanEmail == null || treatmentName == null || treatmentName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Valid client email and treatment name are required."));
            }

            String description = SecuritySanitizer.sanitizeText(rawDescription, 1500);
            String clinicalNotes = SecuritySanitizer.sanitizeText(rawClinicalNotes, 2000);
            String aftercare = SecuritySanitizer.sanitizeText(rawAftercare, 2000);

            Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
            String customerName = customerOpt.map(Customer::getFullName).orElse("Valued Client");
            Long customerId = customerOpt.map(Customer::getId).orElse(0L);

            String staffEmail = getStaffEmail();
            String staffName = userRepository.findByEmail(staffEmail).map(User::getFullName).orElse("Clinic Staff");

            LocalDate tDate = LocalDate.now();
            if (dateStr != null && !dateStr.trim().isEmpty()) {
                try {
                    tDate = LocalDate.parse(dateStr.trim());
                } catch (Exception e) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid treatment date format. Use YYYY-MM-DD."));
                }
            }

            TreatmentRecord record = new TreatmentRecord();
            record.setCustomerId(customerId);
            record.setCustomerEmail(cleanEmail);
            record.setCustomerName(customerName);
            record.setTreatmentName(treatmentName);
            record.setTreatmentDate(tDate);
            record.setPractitionerEmail(staffEmail);
            record.setPractitionerName(staffName);
            record.setDescription(description);
            record.setClinicalNotes(clinicalNotes);
            record.setAftercareInstructions(aftercare != null && !aftercare.isEmpty()
                    ? aftercare
                    : "Keep skin hydrated, avoid direct sun exposure for 48 hours, and apply broad-spectrum SPF 50+ daily.");
            record.setCreatedAt(LocalDateTime.now());
            record.setUpdatedAt(LocalDateTime.now());

            TreatmentRecord saved = treatmentRecordRepository.save(record);

            // Automatically generate customer notification for aftercare
            Notification notif = new Notification();
            notif.setRecipientEmail(cleanEmail);
            notif.setTitle("Treatment Recorded: " + treatmentName);
            notif.setMessage("A new clinical session (" + treatmentName + ") was completed on " + tDate + ". Review your aftercare instructions in your Client Portal.");
            notif.setCategory("AFTERCARE");
            notif.setRead(false);
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notif);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Treatment session successfully recorded.",
                "record", saved
            ));
        } catch (Exception e) {
            logger.error("Failed to record treatment", e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to record treatment."));
        }
    }

    /**
     * Enquiry Management: GET /api/staff/enquiries
     */
    @GetMapping("/enquiries")
    public ResponseEntity<List<ContactMessage>> getEnquiries() {
        return ResponseEntity.ok(contactRepository.findAllByOrderByCreatedAtDesc());
    }

    /**
     * Enquiry Management: PATCH /api/staff/enquiries/{id}/status
     */
    @PatchMapping("/enquiries/{id}/status")
    public ResponseEntity<?> updateEnquiryStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return contactRepository.findById(id).map(msg -> {
            String st = payload.get("status");
            if (st != null) {
                try {
                    msg.setStatus(ContactStatus.valueOf(st.trim().toUpperCase()));
                    contactRepository.save(msg);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Enquiry status updated to " + msg.getStatus()));
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid status value."));
                }
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Enquiry not found.")));
    }

    /**
     * Legacy queue support during transition
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Appointment>> getStaffAppointments() {
        return ResponseEntity.ok(appointmentRepository.findAll());
    }

    @PatchMapping("/appointments/{id}/status")
    public ResponseEntity<?> updateStaffAppointmentStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        String newStatus = payload != null ? payload.get("status") : null;
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status is required"));
        }

        try {
            String staffEmail = getStaffEmail();
            String staffName = userRepository != null
                    ? userRepository.findByEmail(staffEmail).map(User::getFullName).orElse("Clinic Staff")
                    : "Clinic Staff";
            Appointment saved = appointmentBookingService.transitionStatus(id, newStatus, staffName);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment status updated to " + saved.getStatus()
            ));
        } catch (AppointmentNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to update staff appointment status for ID {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Failed to update appointment status."));
        }
    }

    private void syncCompletedAppointments() {
        try {
            List<Appointment> completed = appointmentRepository.findAll().stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .toList();
            for (Appointment a : completed) {
                appointmentBookingService.ensureTreatmentRecordCreated(a, "Derma Aline Specialist");
            }
        } catch (Exception ignored) {}
    }
}
