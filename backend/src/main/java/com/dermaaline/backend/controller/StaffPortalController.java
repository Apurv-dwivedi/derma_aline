package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.*;
import com.dermaaline.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*")
public class StaffPortalController {

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
        if (customer.getFullName() == null || customer.getEmail() == null || customer.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Full name and email are required."));
        }

        String cleanEmail = customer.getEmail().trim().toLowerCase();
        if (customerRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A client record with this email already exists."));
        }

        customer.setEmail(cleanEmail);
        Customer saved = customerRepository.save(customer);
        return ResponseEntity.ok(Map.of("success", true, "message", "Client profile created.", "customer", saved));
    }

    /**
     * Clinical Treatment Records: GET /api/staff/treatments/records
     */
    @GetMapping("/treatments/records")
    public ResponseEntity<List<TreatmentRecord>> getTreatmentRecords() {
        return ResponseEntity.ok(treatmentRecordRepository.findAllByOrderByTreatmentDateDesc());
    }

    /**
     * Clinical Treatment Records: POST /api/staff/treatments/records
     * Authorized staff member logs a treatment performed for a client.
     */
    @PostMapping("/treatments/records")
    public ResponseEntity<?> recordTreatment(@RequestBody Map<String, Object> payload) {
        try {
            String customerEmail = (String) payload.get("customerEmail");
            String treatmentName = (String) payload.get("treatmentName");
            String dateStr = (String) payload.get("treatmentDate");
            String description = (String) payload.get("description");
            String clinicalNotes = (String) payload.get("clinicalNotes");
            String aftercare = (String) payload.get("aftercareInstructions");

            if (customerEmail == null || treatmentName == null || customerEmail.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Client email and treatment name are required."));
            }

            String cleanEmail = customerEmail.trim().toLowerCase();
            Optional<Customer> customerOpt = customerRepository.findByEmail(cleanEmail);
            String customerName = customerOpt.map(Customer::getFullName).orElse("Valued Client");
            Long customerId = customerOpt.map(Customer::getId).orElse(0L);

            String staffEmail = getStaffEmail();
            String staffName = userRepository.findByEmail(staffEmail).map(User::getFullName).orElse("Clinic Staff");

            LocalDate tDate = LocalDate.now();
            if (dateStr != null && !dateStr.trim().isEmpty()) {
                try {
                    tDate = LocalDate.parse(dateStr.trim());
                } catch (Exception ignored) {}
            }

            TreatmentRecord record = new TreatmentRecord();
            record.setCustomerId(customerId);
            record.setCustomerEmail(cleanEmail);
            record.setCustomerName(customerName);
            record.setTreatmentName(treatmentName.trim());
            record.setTreatmentDate(tDate);
            record.setPractitionerEmail(staffEmail);
            record.setPractitionerName(staffName);
            record.setDescription(description);
            record.setClinicalNotes(clinicalNotes);
            record.setAftercareInstructions(aftercare != null && !aftercare.trim().isEmpty() 
                    ? aftercare.trim() 
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
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to record treatment: " + e.getMessage()));
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
