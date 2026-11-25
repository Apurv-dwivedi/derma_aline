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
import com.dermaaline.backend.security.SecuritySanitizer;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AppointmentBookingService.AppointmentNotFoundException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingConflictException;
import com.dermaaline.backend.service.AppointmentBookingService.BookingValidationException;
import com.dermaaline.backend.service.AppointmentBookingService.ForbiddenAppointmentAccessException;
import com.dermaaline.backend.service.AuditLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/client")
@PreAuthorize("hasAnyRole('CUSTOMER', 'PATIENT', 'SUPER_ADMIN', 'ADMIN')")
public class ClientPortalController {

    private static final Logger logger = LoggerFactory.getLogger(ClientPortalController.class);

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
    private AppointmentBookingService appointmentBookingService;

    @Autowired(required = false)
    private AuditLogService auditLogService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Helper to safely extract authenticated client's email from the JWT security principal.
     * Prevents IDOR and horizontal privilege escalation.
     */
    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized access: no authenticated user found.");
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

        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request body is required."));
        }

        User user = userOpt.get();
        String newFullName = SecuritySanitizer.sanitizeText(payload.get("fullName"), 100);
        String rawPhone = payload.get("phone");
        String newPhone = rawPhone != null && !rawPhone.trim().isEmpty() ? SecuritySanitizer.sanitizePhone(rawPhone) : null;
        if (rawPhone != null && !rawPhone.trim().isEmpty() && newPhone == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid phone number format."));
        }

        String rawPic = payload.get("profilePicture");
        String safePic = null;
        if (rawPic != null) {
            safePic = SecuritySanitizer.sanitizeImageUrl(rawPic, 500_000);
            if (safePic == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid profile picture format."));
            }
        }

        if (newFullName != null && !newFullName.trim().isEmpty()) {
            user.setFullName(newFullName.trim());
        }
        if (rawPhone != null) {
            user.setPhone(newPhone != null ? newPhone.trim() : "");
        }
        if (safePic != null) {
            user.setProfilePicture(safePic.isEmpty() ? null : safePic);
        }

        userRepository.save(user);

        final String finalSafePic = safePic;
        customerRepository.findByEmail(email).ifPresent(customer -> {
            if (newFullName != null && !newFullName.trim().isEmpty()) customer.setFullName(newFullName.trim());
            if (rawPhone != null) customer.setPhone(newPhone != null ? newPhone.trim() : "");
            if (finalSafePic != null) customer.setProfilePicture(finalSafePic.isEmpty() ? null : finalSafePic);
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
    public ResponseEntity<?> updateProfilePhoto(@RequestBody(required = false) Map<String, String> payload) {
        String email = getAuthenticatedEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found."));
        }

        String rawPhoto = payload != null ? payload.get("profilePicture") : null;
        String safePhoto = "";
        if (rawPhoto != null && !rawPhoto.trim().isEmpty()) {
            safePhoto = SecuritySanitizer.sanitizeImageUrl(rawPhoto, 500_000);
            if (safePhoto == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid image data or URL."));
            }
        }

        User user = userOpt.get();
        String storedPhoto = safePhoto.isEmpty() ? null : safePhoto;
        user.setProfilePicture(storedPhoto);
        userRepository.save(user);

        customerRepository.findByEmail(email).ifPresent(customer -> {
            customer.setProfilePicture(storedPhoto);
            customerRepository.save(customer);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", storedPhoto != null ? "Profile photo updated successfully." : "Profile photo removed.",
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
    public ResponseEntity<?> bookAppointment(@RequestBody(required = false) Map<String, Object> payload) {
        String email = getAuthenticatedEmail();
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Booking details are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        User user = userOpt.orElse(null);
        String clientName = user != null && user.getFullName() != null ? user.getFullName() : "Valued Client";
        String clientPhone = user != null && user.getPhone() != null ? user.getPhone() : "";

        String treatmentName = payload.get("treatmentName") != null ? payload.get("treatmentName").toString() : null;
        String dateStr = payload.get("appointmentDate") != null ? payload.get("appointmentDate").toString() : null;
        String timeStr = payload.get("appointmentTime") != null ? payload.get("appointmentTime").toString() : null;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : "";

        try {
            Appointment saved = appointmentBookingService.createBooking(
                    clientName, email, clientPhone, treatmentName, dateStr, timeStr, notes, false);

            try {
                Notification notif = new Notification();
                notif.setRecipientEmail(email);
                notif.setTitle("Appointment Requested: " + saved.getTreatmentName());
                notif.setMessage("Your consultation booking for " + saved.getTreatmentName() + " on " + saved.getAppointmentDate().toLocalDate()
                        + " (" + saved.getAppointmentTime() + ") has been received. Our clinical desk will confirm your scheduled slot.");
                notif.setCategory("APPOINTMENT");
                notif.setRead(false);
                notif.setCreatedAt(java.time.LocalDateTime.now());
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            if (auditLogService != null) {
                auditLogService.record("CLIENT_APPOINTMENT_BOOKED", email, "CUSTOMER", "APPOINTMENT",
                        saved.getId() != null ? saved.getId().toString() : "N/A",
                        "Booked " + saved.getTreatmentName() + " for " + saved.getAppointmentDate().toLocalDate());
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment booked successfully! Our clinic desk will confirm your session.",
                "appointment", saved
            ));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to create client appointment for {}", email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Unable to complete appointment booking."));
        }
    }

    /**
     * Customer Self-Service Appointment Cancellation: PATCH /api/client/appointments/{id}/cancel
     */
    @PatchMapping("/appointments/{id}/cancel")
    public ResponseEntity<?> cancelMyAppointment(@PathVariable Long id) {
        String email = getAuthenticatedEmail();
        try {
            Appointment cancelled = appointmentBookingService.cancelCustomerAppointment(id, email);

            try {
                Notification notif = new Notification();
                notif.setRecipientEmail(email);
                notif.setTitle("Appointment Cancelled: " + cancelled.getTreatmentName());
                notif.setMessage("Your scheduled appointment for " + cancelled.getTreatmentName()
                        + (cancelled.getAppointmentDate() != null ? " on " + cancelled.getAppointmentDate().toLocalDate() : "")
                        + " has been cancelled as requested.");
                notif.setCategory("APPOINTMENT");
                notif.setRead(false);
                notif.setCreatedAt(java.time.LocalDateTime.now());
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            if (auditLogService != null) {
                auditLogService.record("CLIENT_APPOINTMENT_CANCELLED", email, "CUSTOMER", "APPOINTMENT",
                        id.toString(), "Client cancelled appointment");
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Appointment cancelled successfully.",
                "appointment", cancelled
            ));
        } catch (ForbiddenAppointmentAccessException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", e.getMessage()));
        } catch (AppointmentNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", e.getMessage()));
        } catch (BookingValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to cancel appointment {} for {}", id, email, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Unable to cancel appointment."));
        }
    }
}
