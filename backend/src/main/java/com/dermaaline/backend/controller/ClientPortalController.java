package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.entity.Notification;
import com.dermaaline.backend.entity.TreatmentRecord;
import com.dermaaline.backend.entity.User;
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

        if (newFullName != null && !newFullName.trim().isEmpty()) {
            user.setFullName(newFullName.trim());
        }
        if (newPhone != null) {
            user.setPhone(newPhone.trim());
        }

        userRepository.save(user);

        // Synchronize corresponding Customer CRM record if present
        customerRepository.findByEmail(email).ifPresent(customer -> {
            if (newFullName != null) customer.setFullName(newFullName.trim());
            if (newPhone != null) customer.setPhone(newPhone.trim());
            customerRepository.save(customer);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Profile updated successfully.",
            "fullName", user.getFullName(),
            "phone", user.getPhone() != null ? user.getPhone() : ""
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
}
