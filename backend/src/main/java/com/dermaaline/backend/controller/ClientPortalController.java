package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.Notification;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.NotificationRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/client")
@CrossOrigin(origins = "*")
public class ClientPortalController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Helper to safely extract authenticated client's email from the JWT security principal.
     * Prevents IDOR and horizontal privilege escalation.
     */
    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new SecurityException("Unauthorized access: no authenticated user found.");
        }
        return auth.getName().trim().toLowerCase();
    }

    /**
     * Customer Profile: GET /api/client/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Client profile not found."));
        }

        User user = userOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone() != null ? user.getPhone() : "");
        response.put("role", user.getRole().name());
        response.put("status", user.getStatus().name());
        response.put("createdAt", user.getCreatedAt());
        response.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");

        long treatmentCount = treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(email).size();
        response.put("totalTreatments", treatmentCount);

        return ResponseEntity.ok(response);
    }

    /**
     * Customer Profile Update: PUT /api/client/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        User user = userOpt.get();
        String newFullName = payload.get("fullName");
        String newPhone = payload.get("phone");
        String newProfilePicture = payload.get("profilePicture");

        if (newFullName != null && !newFullName.trim().isEmpty()) {
            user.setFullName(newFullName.trim());
        }
        if (newPhone != null) {
            user.setPhone(newPhone.trim());
        }
        if (newProfilePicture != null) {
            user.setProfilePicture(newProfilePicture.trim());
        }

        userRepository.save(user);

        // Synchronize corresponding Customer CRM record if present
        customerRepository.findByEmail(email).ifPresent(customer -> {
            if (newFullName != null && !newFullName.trim().isEmpty()) customer.setFullName(newFullName.trim());
            if (newPhone != null) customer.setPhone(newPhone.trim());
            if (newProfilePicture != null) customer.setProfilePicture(newProfilePicture.trim());
            customerRepository.save(customer);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Profile updated successfully.",
            "fullName", user.getFullName(),
            "phone", user.getPhone() != null ? user.getPhone() : "",
            "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
        ));
    }

    /**
     * Customer Profile Photo Upload/Update: PUT /api/client/profile/photo
     */
    @PutMapping("/profile/photo")
    public ResponseEntity<?> updateProfilePhoto(@RequestBody Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        User user = userOpt.get();
        String photo = payload.get("profilePicture");
        user.setProfilePicture(photo != null && !photo.trim().isEmpty() ? photo.trim() : null);
        userRepository.save(user);

        customerRepository.findByEmail(email).ifPresent(customer -> {
            customer.setProfilePicture(photo != null && !photo.trim().isEmpty() ? photo.trim() : null);
            customerRepository.save(customer);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", photo != null && !photo.trim().isEmpty() ? "Profile photo updated successfully." : "Profile photo removed.",
            "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
        ));
    }

    /**
     * Customer Profile Photo Deletion: DELETE /api/client/profile/photo
     */
    @DeleteMapping("/profile/photo")
    public ResponseEntity<?> deleteProfilePhoto() {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        User user = userOpt.get();
        user.setProfilePicture(null);
        userRepository.save(user);

        customerRepository.findByEmail(email).ifPresent(customer -> {
            customer.setProfilePicture(null);
            customerRepository.save(customer);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Profile photo removed.",
            "profilePicture", ""
        ));
    }

    /**
     * Customer Treatment History: GET /api/client/treatments
     * Returns strictly the authenticated client's clinical treatment records entered by staff.
     */
    @GetMapping("/treatments")
    public ResponseEntity<List<TreatmentRecord>> getMyTreatments() {
        String email = getAuthenticatedEmail();
        List<TreatmentRecord> records = treatmentRecordRepository
                .findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(email);
        return ResponseEntity.ok(records);
    }

    /**
     * Customer Enquiries: GET /api/client/enquiries
     */
    @GetMapping("/enquiries")
    public ResponseEntity<List<ContactMessage>> getMyEnquiries() {
        String email = getAuthenticatedEmail();
        List<ContactMessage> messages = contactRepository.findByEmailIgnoreCaseOrderByCreatedAtDesc(email);
        return ResponseEntity.ok(messages);
    }

    /**
     * Customer Notifications: GET /api/client/notifications
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        String email = getAuthenticatedEmail();
        List<Notification> notifications = notificationRepository
                .findByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(email);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Mark Notification Read: PATCH /api/client/notifications/{id}/read
     */
    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationRead(@PathVariable Long id) {
        String email = getAuthenticatedEmail();
        return notificationRepository.findById(id).map(notif -> {
            if (!email.equalsIgnoreCase(notif.getRecipientEmail())) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Unauthorized access."));
            }
            notif.setRead(true);
            notificationRepository.save(notif);
            return ResponseEntity.ok(Map.of("success", true, "message", "Notification marked as read."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Notification not found.")));
    }

    /**
     * Customer Appointments: GET /api/client/appointments
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Appointment>> getMyAppointments() {
        String email = getAuthenticatedEmail();
        List<Appointment> appointments = appointmentRepository
                .findByCustomerEmailIgnoreCaseOrEmailIgnoreCaseOrderByAppointmentDateDesc(email, email);
        return ResponseEntity.ok(appointments);
    }

    /**
     * Customer Self-Booking: POST /api/client/appointments
     */
    @PostMapping("/appointments")
    public ResponseEntity<?> bookAppointment(@RequestBody Map<String, Object> payload) {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        String treatmentName = (String) payload.get("treatmentName");
        String dateStr = (String) payload.get("appointmentDate");
        String timeStr = (String) payload.get("appointmentTime");
        String notes = (String) payload.get("notes");

        if (treatmentName == null || treatmentName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment selection is required."));
        }
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Appointment date is required."));
        }

        User user = userOpt.orElse(null);
        String clientName = user != null && user.getFullName() != null ? user.getFullName() : "Valued Client";
        String clientPhone = user != null && user.getPhone() != null ? user.getPhone() : "";

        Appointment appt = new Appointment();
        appt.setCustomerName(clientName);
        appt.setPatientName(clientName);
        appt.setCustomerEmail(email);
        appt.setEmail(email);
        appt.setCustomerPhone(clientPhone);
        appt.setPhone(clientPhone);
        appt.setTreatmentName(treatmentName.trim());
        appt.setAppointmentTime(timeStr != null && !timeStr.trim().isEmpty() ? timeStr.trim() : "10:00 AM");
        appt.setNotes(notes != null ? notes.trim() : "");
        appt.setStatus("PENDING");
        appt.setCreatedAt(java.time.LocalDateTime.now());

        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(dateStr.trim().substring(0, 10));
            appt.setAppointmentDate(localDate.atStartOfDay());
        } catch (Exception e) {
            appt.setAppointmentDate(java.time.LocalDateTime.now().plusDays(1));
        }

        Appointment saved = appointmentRepository.save(appt);

        try {
            Notification notif = new Notification();
            notif.setRecipientEmail(email);
            notif.setTitle("Appointment Requested: " + treatmentName.trim());
            notif.setMessage("Your consultation booking for " + treatmentName.trim() + " on " + dateStr.trim() + " (" + appt.getAppointmentTime() + ") has been received. Our clinical desk will confirm your scheduled slot.");
            notif.setCategory("APPOINTMENT");
            notif.setRead(false);
            notif.setCreatedAt(java.time.LocalDateTime.now());
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Appointment booked successfully! Our clinic desk will confirm your session.",
            "appointment", saved
        ));
    }
}
