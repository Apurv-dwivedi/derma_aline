package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/staff")
public class StaffManagementController {

    @Autowired
    private StaffInvitationRepository staffInvitationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.dermaaline.backend.service.AuditLogService auditLogService;

    @Value("${app.frontend.url:https://derma-aline.vercel.app}")
    private String frontendUrl;

    @GetMapping("/invitations")
    public ResponseEntity<List<StaffInvitation>> getAllInvitations() {
        return ResponseEntity.ok(staffInvitationRepository.findAll());
    }

    @GetMapping("/members")
    public ResponseEntity<?> getAllStaffMembers() {
        List<Map<String, Object>> staffList = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.STAFF)
                .map(u -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", u.getId());
                    map.put("fullName", u.getFullName());
                    map.put("email", u.getEmail());
                    map.put("phone", u.getPhone());
                    map.put("role", u.getRole().name());
                    map.put("status", u.getStatus() != null ? u.getStatus().name() : "ACTIVE");
                    map.put("createdAt", u.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(staffList);
    }

    @PostMapping("/invitations")
    public ResponseEntity<?> sendStaffInvitation(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            String fullName = payload.get("fullName");
            String designation = payload.get("designation");
            String phone = payload.get("phone");

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Staff email is required."));
            }

            String cleanEmail = email.trim().toLowerCase();

            // Check if active user already exists
            Optional<User> existingUser = userRepository.findByEmail(cleanEmail);
            if (existingUser.isPresent() && existingUser.get().getStatus() == User.AccountStatus.ACTIVE) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "An active staff account with this email already exists."));
            }

            String token = UUID.randomUUID().toString();
            StaffInvitation invitation = staffInvitationRepository.findByEmail(cleanEmail)
                    .orElseGet(StaffInvitation::new);
            invitation.setEmail(cleanEmail);
            invitation.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : "Clinic Staff");
            invitation.setDesignation(designation != null && !designation.trim().isEmpty() ? designation.trim() : "Skin Therapist");
            invitation.setPhone(phone != null ? phone.trim() : null);
            invitation.setToken(token);
            invitation.setStatus(StaffInvitation.InvitationStatus.INVITED);
            invitation.setExpiresAt(LocalDateTime.now().plusHours(24));
            invitation.setCreatedAt(LocalDateTime.now());
            staffInvitationRepository.save(invitation);

            // Send invitation email with activation link
            String activationUrl = frontendUrl + "/staff/activate?token=" + token;
            String subject = "Staff Invitation | Derma Aline Aesthétics Clinic";
            String body = "Dear " + invitation.getFullName() + ",\n\n"
                    + "You have been invited by the Clinic Owner to join the operational team at Derma Aline Aesthétics Skin Clinic as " 
                    + invitation.getDesignation() + ".\n\n"
                    + "Please click the link below to set your confidential password and activate your staff access:\n"
                    + activationUrl + "\n\n"
                    + "Note: For security reasons, this invitation link will expire in 24 hours.\n\n"
                    + "Warm regards,\n"
                    + "Derma Aline Clinic Administration";

            emailService.sendEmail(cleanEmail, subject, body);
            auditLogService.record("STAFF_INVITED", "admin", "SUPER_ADMIN", "STAFF_INVITATION", cleanEmail, "Invitation generated for " + invitation.getFullName() + " (" + invitation.getDesignation() + ")");

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Staff invitation link generated and dispatched to " + cleanEmail,
                "email", cleanEmail,
                "fullName", invitation.getFullName(),
                "designation", invitation.getDesignation()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to dispatch invitation: " + e.getMessage()));
        }
    }

    @PostMapping("/invitations/{id}/resend")
    public ResponseEntity<?> resendInvitation(@PathVariable Long id) {
        return staffInvitationRepository.findById(id).map(invitation -> {
            String token = UUID.randomUUID().toString();
            invitation.setToken(token);
            invitation.setStatus(StaffInvitation.InvitationStatus.INVITED);
            invitation.setExpiresAt(LocalDateTime.now().plusHours(24));
            staffInvitationRepository.save(invitation);

            String activationUrl = frontendUrl + "/staff/activate?token=" + token;
            String subject = "Staff Invitation (Resent) | Derma Aline Aesthétics Clinic";
            String body = "Dear " + invitation.getFullName() + ",\n\n"
                    + "Your invitation link for Derma Aline Aesthétics Skin Clinic has been renewed.\n\n"
                    + "Please click the link below to activate your staff workspace:\n"
                    + activationUrl + "\n\n"
                    + "This link is valid for 24 hours.\n\n"
                    + "Derma Aline Clinic Administration";

            emailService.sendEmail(invitation.getEmail(), subject, body);
            auditLogService.record("STAFF_INVITATION_RESENT", "admin", "SUPER_ADMIN", "STAFF_INVITATION", invitation.getEmail(), "Invitation link renewed for " + invitation.getFullName());

            return ResponseEntity.ok(Map.of("success", true, "message", "Invitation resent to " + invitation.getEmail()));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Invitation not found.")));
    }

    @PatchMapping("/members/{id}/status")
    public ResponseEntity<?> toggleMemberStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return userRepository.findById(id).map(user -> {
            String newStatusStr = payload.get("status");
            if (newStatusStr != null) {
                try {
                    user.setStatus(User.AccountStatus.valueOf(newStatusStr.trim().toUpperCase()));
                    userRepository.save(user);
                    auditLogService.record("STAFF_STATUS_CHANGED", "admin", "SUPER_ADMIN", "USER", user.getEmail(), "Account status updated to " + user.getStatus());
                    return ResponseEntity.ok(Map.of(
                        "success", true, 
                        "message", "Staff status updated to " + user.getStatus(),
                        "status", user.getStatus().name()
                    ));
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid status value."));
                }
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Status parameter is required."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff member not found.")));
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<?> deleteInvitation(@PathVariable Long id) {
        return staffInvitationRepository.findById(id).map(invitation -> {
            invitation.setStatus(StaffInvitation.InvitationStatus.REVOKED);
            staffInvitationRepository.save(invitation);
            return ResponseEntity.ok(Map.of("success", true, "message", "Invitation revoked successfully."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Invitation not found.")));
    }

    @DeleteMapping("/members/{id}")
    public ResponseEntity<?> revokeStaffAccount(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Cannot revoke clinic administrator accounts."));
            }
            user.setStatus(User.AccountStatus.DISABLED);
            userRepository.save(user);
            auditLogService.record("STAFF_DEACTIVATED", "admin", "SUPER_ADMIN", "USER", user.getEmail(), "Staff account disabled");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff access deactivated successfully."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff member not found.")));
    }
}
