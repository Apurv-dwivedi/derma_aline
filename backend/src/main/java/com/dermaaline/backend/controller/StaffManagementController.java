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

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/staff")
public class StaffManagementController {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String TEMP_PASS_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

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
            String customPassword = payload.get("password");

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Staff email is required."));
            }

            String cleanEmail = email.trim().toLowerCase();
            if (customPassword != null && !customPassword.trim().isEmpty() && customPassword.trim().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Initial password must be at least 6 characters long."));
            }
            String initialPassword = (customPassword != null && !customPassword.trim().isEmpty())
                    ? customPassword.trim()
                    : generateRandomInitialPassword();

            // Immediately create or activate staff account in users table
            User staffUser = userRepository.findByEmail(cleanEmail).orElseGet(User::new);
            staffUser.setEmail(cleanEmail);
            staffUser.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : "Clinic Staff");
            staffUser.setPhone(phone != null && !phone.trim().isEmpty() ? phone.trim() : staffUser.getPhone());
            staffUser.setRole(User.Role.STAFF);
            staffUser.setStatus(User.AccountStatus.ACTIVE);
            staffUser.setPassword(passwordEncoder.encode(initialPassword));
            userRepository.save(staffUser);

            // Record in staff invitations as ACTIVE (no token/activation required)
            StaffInvitation invitation = staffInvitationRepository.findByEmail(cleanEmail)
                    .orElseGet(StaffInvitation::new);
            invitation.setEmail(cleanEmail);
            invitation.setFullName(staffUser.getFullName());
            invitation.setDesignation(designation != null && !designation.trim().isEmpty() ? designation.trim() : "Skin Therapist");
            invitation.setPhone(staffUser.getPhone());
            invitation.setStatus(StaffInvitation.InvitationStatus.ACTIVE);
            invitation.setExpiresAt(LocalDateTime.now().plusYears(10));
            invitation.setCreatedAt(LocalDateTime.now());
            staffInvitationRepository.save(invitation);

            // Send welcoming email directly with login credentials and no OTP needed
            String loginUrl = frontendUrl + "/staff/login";
            String subject = "Staff Account Enrolled | Derma Aline Aesthétics Clinic";
            String body = "Dear " + staffUser.getFullName() + ",\n\n"
                    + "You have been enrolled as a staff team member at Derma Aline Aesthétics Skin Clinic as " 
                    + invitation.getDesignation() + ".\n\n"
                    + "Your Staff Workspace credentials are:\n"
                    + "• Portal Login URL: " + loginUrl + "\n"
                    + "• Email: " + cleanEmail + "\n"
                    + "• Initial Password: " + initialPassword + "\n\n"
                    + "You can log in directly at " + loginUrl + " without needing any OTP code or activation token.\n"
                    + "Once logged in, you can update your password anytime through your portal.\n\n"
                    + "Warm regards,\n"
                    + "Derma Aline Clinic Administration";

            emailService.sendEmail(cleanEmail, subject, body);
            auditLogService.record("STAFF_ENROLLED", "admin", "SUPER_ADMIN", "STAFF_USER", cleanEmail, "Staff account created with initial password for " + staffUser.getFullName());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Staff account successfully created with initial password for " + cleanEmail,
                "email", cleanEmail,
                "fullName", staffUser.getFullName(),
                "designation", invitation.getDesignation(),
                "initialPassword", initialPassword
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to enroll staff member: " + e.getMessage()));
        }
    }

    private String generateRandomInitialPassword() {
        StringBuilder sb = new StringBuilder(14);
        for (int i = 0; i < 14; i++) {
            sb.append(TEMP_PASS_CHARS.charAt(SECURE_RANDOM.nextInt(TEMP_PASS_CHARS.length())));
        }
        return sb.toString();
    }

    @PutMapping("/members/{id}/password")
    public ResponseEntity<?> updateStaffPassword(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newPassword = payload.get("newPassword");
        if (newPassword == null || newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be at least 6 characters long."));
        }
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != User.Role.STAFF) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Can only modify staff accounts."));
            }
            user.setPassword(passwordEncoder.encode(newPassword.trim()));
            user.setStatus(User.AccountStatus.ACTIVE);
            userRepository.save(user);

            try {
                String subject = "Staff Password Updated | Derma Aline Aesthétics Clinic";
                String body = "Dear " + user.getFullName() + ",\n\n"
                        + "Your staff portal password has been updated by the clinic owner.\n\n"
                        + "• Updated Password: " + newPassword.trim() + "\n"
                        + "• Staff Login URL: " + frontendUrl + "/staff/login\n\n"
                        + "Warm regards,\n"
                        + "Derma Aline Clinic Administration";
                emailService.sendEmail(user.getEmail(), subject, body);
            } catch (Exception ignored) {}

            auditLogService.record("STAFF_PASSWORD_UPDATED", "admin", "SUPER_ADMIN", "STAFF_USER", user.getEmail(), "Password reset by owner for " + user.getFullName());
            return ResponseEntity.ok(Map.of("success", true, "message", "Password for " + user.getFullName() + " (" + user.getEmail() + ") has been updated successfully."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff account not found.")));
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
        Optional<StaffInvitation> invitationOpt = staffInvitationRepository.findById(id);
        if (invitationOpt.isPresent()) {
            StaffInvitation invitation = invitationOpt.get();
            String email = invitation.getEmail();
            staffInvitationRepository.delete(invitation);
            if (email != null && !email.trim().isEmpty()) {
                userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
                    if (user.getRole() == User.Role.STAFF) {
                        userRepository.delete(user);
                    }
                });
            }
            auditLogService.record("STAFF_INVITATION_DELETED", "admin", "SUPER_ADMIN", "STAFF_INVITATION", email != null ? email : id.toString(), "Staff invitation revoked and removed");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff invitation removed successfully."));
        }

        // Fallback: If passed ID is actually a user ID for a staff member
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getRole() == User.Role.STAFF) {
                String email = user.getEmail();
                userRepository.delete(user);
                if (email != null && !email.trim().isEmpty()) {
                    staffInvitationRepository.findByEmail(email.trim().toLowerCase()).ifPresent(staffInvitationRepository::delete);
                }
                auditLogService.record("STAFF_DELETED", "admin", "SUPER_ADMIN", "USER", email != null ? email : id.toString(), "Staff account removed permanently from salon");
                return ResponseEntity.ok(Map.of("success", true, "message", "Staff account removed from salon successfully."));
            }
        }

        return ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff invitation or account not found."));
    }

    @DeleteMapping("/members/{id}")
    public ResponseEntity<?> revokeStaffAccount(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Cannot delete clinic administrator accounts."));
            }
            String email = user.getEmail();
            userRepository.delete(user);
            if (email != null && !email.trim().isEmpty()) {
                staffInvitationRepository.findByEmail(email.trim().toLowerCase()).ifPresent(staffInvitationRepository::delete);
            }
            auditLogService.record("STAFF_DELETED", "admin", "SUPER_ADMIN", "USER", email != null ? email : id.toString(), "Staff account removed permanently from salon");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff account removed from salon successfully."));
        }

        // Fallback: If passed ID is actually an invitation ID
        Optional<StaffInvitation> invitationOpt = staffInvitationRepository.findById(id);
        if (invitationOpt.isPresent()) {
            StaffInvitation invitation = invitationOpt.get();
            String email = invitation.getEmail();
            staffInvitationRepository.delete(invitation);
            if (email != null && !email.trim().isEmpty()) {
                userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
                    if (user.getRole() == User.Role.STAFF) {
                        userRepository.delete(user);
                    }
                });
            }
            auditLogService.record("STAFF_INVITATION_DELETED", "admin", "SUPER_ADMIN", "STAFF_INVITATION", email != null ? email : id.toString(), "Staff invitation revoked and removed");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff invitation removed successfully."));
        }

        return ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff member not found."));
    }
}
