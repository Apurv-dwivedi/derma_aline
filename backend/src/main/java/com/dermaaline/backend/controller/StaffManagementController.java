package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.EmailVerificationOtpRepository;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import com.dermaaline.backend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/staff")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class StaffManagementController {

    private static final Logger logger = LoggerFactory.getLogger(StaffManagementController.class);

    private String getActorEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "admin";
    }

    @Autowired
    private StaffInvitationRepository staffInvitationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private EmailVerificationOtpRepository emailVerificationOtpRepository;

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
                    map.put("status", u.getStatus() != null ? u.getStatus().name() : "PENDING_VERIFICATION");
                    map.put("createdAt", u.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(staffList);
    }

    @PostMapping("/invitations")
    @Transactional
    public ResponseEntity<?> sendStaffInvitation(@RequestBody Map<String, String> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Request payload is required."));
        }
        try {
            String cleanEmail = SecuritySanitizer.sanitizeEmail(payload.get("email"));
            String fullName = SecuritySanitizer.sanitizeText(payload.get("fullName"), 100);
            String designation = SecuritySanitizer.sanitizeText(payload.get("designation"), 100);
            String phone = SecuritySanitizer.sanitizePhone(payload.get("phone"));

            if (cleanEmail == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "A valid staff email is required."));
            }

            Optional<User> existingOpt = userRepository.findByEmail(cleanEmail);
            if (existingOpt.isPresent()) {
                User existing = existingOpt.get();
                if (existing.getRole() == User.Role.SUPER_ADMIN || existing.getRole() == User.Role.ADMIN) {
                    return ResponseEntity.status(403).body(Map.of("success", false, "message", "Cannot modify administrator privileges through staff onboarding."));
                }
                if (existing.getRole() == User.Role.STAFF && existing.getStatus() == User.AccountStatus.ACTIVE) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "This staff account is already active. Use Send Password Reset Link or status controls in the table below."
                    ));
                }
            }

            // Create/update staff user strictly in PENDING_VERIFICATION until single-use token activation
            User staffUser = existingOpt.orElseGet(User::new);
            staffUser.setEmail(cleanEmail);
            staffUser.setFullName(fullName != null && !fullName.isEmpty() ? fullName : "Clinic Staff");
            staffUser.setPhone(phone != null && !phone.isEmpty() ? phone : staffUser.getPhone());
            staffUser.setRole(User.Role.STAFF);
            staffUser.setStatus(User.AccountStatus.PENDING_VERIFICATION);
            // Random unexposed placeholder hash; account cannot sign in until staff sets their own password via activation token
            staffUser.setPassword(passwordEncoder.encode(UUID.randomUUID() + "-" + UUID.randomUUID()));
            staffUser.incrementTokenVersion();
            userRepository.save(staffUser);

            String activationToken = UUID.randomUUID().toString();
            StaffInvitation invitation = staffInvitationRepository.findByEmail(cleanEmail)
                    .orElseGet(StaffInvitation::new);
            invitation.setEmail(cleanEmail);
            invitation.setFullName(staffUser.getFullName());
            invitation.setDesignation(designation != null && !designation.isEmpty() ? designation : "Skin Therapist");
            invitation.setPhone(staffUser.getPhone());
            invitation.setToken(activationToken);
            invitation.setStatus(StaffInvitation.InvitationStatus.INVITED);
            invitation.setExpiresAt(LocalDateTime.now().plusHours(24));
            invitation.setCreatedAt(LocalDateTime.now());
            staffInvitationRepository.save(invitation);

            String activationUrl = buildActivationUrl(activationToken);
            String subject = "Staff Workspace Invitation | Derma Aline Aesthétics Clinic";
            String body = "Dear " + staffUser.getFullName() + ",\n\n"
                    + "You have been invited to join the clinical team at Derma Aline Aesthétics Skin Clinic as "
                    + invitation.getDesignation() + ".\n\n"
                    + "Please activate your account and create your personal password using the single-use onboarding link below:\n"
                    + activationUrl + "\n\n"
                    + "For your security, this invitation link is valid for 24 hours and does not contain any password.\n\n"
                    + "Warm regards,\n"
                    + "Derma Aline Clinic Administration";

            boolean sent = emailService.sendEmail(cleanEmail, subject, body);
            auditLogService.record(
                "STAFF_INVITED",
                getActorEmail(),
                "ADMIN",
                "STAFF_INVITATION",
                cleanEmail,
                "Staff invitation prepared for " + staffUser.getFullName() + " (emailDispatched=" + sent + ")"
            );

            if (!sent) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "inviteSaved", true,
                    "status", "INVITED",
                    "email", cleanEmail,
                    "message", "Staff invitation saved, but the onboarding email could not be delivered right now. Please check email settings and click Resend Invite."
                ));
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "INVITED",
                "message", "Secure onboarding invitation link sent to " + cleanEmail + ". The staff member can activate access and set their password using the link.",
                "email", cleanEmail,
                "fullName", staffUser.getFullName(),
                "designation", invitation.getDesignation()
            ));
        } catch (Exception e) {
            logger.error("Failed to invite staff member", e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to send staff invitation."));
        }
    }

    @PostMapping({"/members/{id}/reset-invite", "/members/{id}/resend-invite"})
    @Transactional
    public ResponseEntity<?> sendStaffActivationOrResetLink(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != User.Role.STAFF) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Can only manage staff onboarding invitations."));
            }
            if (user.getStatus() == User.AccountStatus.DISABLED) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "This staff account is currently disabled. Enable the account first."));
            }

            user.incrementTokenVersion();
            userRepository.save(user);

            String token = UUID.randomUUID().toString();
            StaffInvitation invitation = staffInvitationRepository.findByEmail(user.getEmail())
                    .orElseGet(StaffInvitation::new);
            invitation.setEmail(user.getEmail());
            invitation.setFullName(user.getFullName());
            invitation.setPhone(user.getPhone());
            if (invitation.getDesignation() == null || invitation.getDesignation().isBlank()) {
                invitation.setDesignation("Skin Therapist");
            }
            invitation.setToken(token);
            invitation.setStatus(StaffInvitation.InvitationStatus.INVITED);
            invitation.setExpiresAt(LocalDateTime.now().plusHours(24));
            if (invitation.getCreatedAt() == null) {
                invitation.setCreatedAt(LocalDateTime.now());
            }
            staffInvitationRepository.save(invitation);

            String activationUrl = buildActivationUrl(token);
            String subject = "Staff Onboarding & Password Setup Link | Derma Aline Aesthétics Clinic";
            String body = "Dear " + user.getFullName() + ",\n\n"
                    + "The clinic administrator has issued a secure single-use staff workspace setup link for your account.\n\n"
                    + "Please use the link below to set your password and sign in:\n"
                    + activationUrl + "\n\n"
                    + "This link expires in 24 hours. Any previous staff portal sessions have been signed out.\n\n"
                    + "Warm regards,\n"
                    + "Derma Aline Clinic Administration";

            boolean sent = emailService.sendEmail(user.getEmail(), subject, body);
            auditLogService.record(
                "STAFF_RESET_LINK_ISSUED",
                getActorEmail(),
                "ADMIN",
                "STAFF_INVITATION",
                user.getEmail(),
                "Single-use activation/reset link issued (emailDispatched=" + sent + ")"
            );

            if (!sent) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Reset link generated, but email delivery failed right now. Please try again shortly."
                ));
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Secure single-use setup/reset link sent to " + user.getEmail()
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff account not found.")));
    }

    @PutMapping("/members/{id}/password")
    @Transactional
    public ResponseEntity<?> updateStaffPassword(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newPassword = payload != null ? payload.get("newPassword") : null;
        if (newPassword == null || newPassword.trim().length() < 6 || newPassword.trim().length() > 128) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be between 6 and 128 characters long."));
        }
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != User.Role.STAFF) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Can only modify staff accounts."));
            }
            user.setPassword(passwordEncoder.encode(newPassword.trim()));
            user.setStatus(User.AccountStatus.ACTIVE);
            user.incrementTokenVersion();
            userRepository.save(user);

            try {
                String subject = "Staff Password Security Alert | Derma Aline Aesthétics Clinic";
                String body = "Dear " + user.getFullName() + ",\n\n"
                        + "Your staff portal password was updated by the clinic administrator.\n"
                        + "For your security, passwords are never transmitted by email. Active prior sessions have been signed out.\n\n"
                        + "• Staff Portal Login: " + frontendUrl.replaceAll("/+$", "") + "/staff/login\n\n"
                        + "If this change was unexpected, please contact the clinic owner immediately.\n\n"
                        + "Warm regards,\n"
                        + "Derma Aline Clinic Administration";
                emailService.sendEmail(user.getEmail(), subject, body);
            } catch (Exception ignored) {}

            auditLogService.record("STAFF_PASSWORD_UPDATED", getActorEmail(), "ADMIN", "STAFF_USER", user.getEmail(), "Password updated by admin (active sessions revoked)");
            return ResponseEntity.ok(Map.of("success", true, "message", "Password for " + user.getFullName() + " updated securely and prior sessions revoked."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff account not found.")));
    }

    @PostMapping("/invitations/{id}/resend")
    @Transactional
    public ResponseEntity<?> resendInvitation(@PathVariable Long id) {
        return staffInvitationRepository.findById(id).map(invitation -> {
            String token = UUID.randomUUID().toString();
            invitation.setToken(token);
            invitation.setStatus(StaffInvitation.InvitationStatus.INVITED);
            invitation.setExpiresAt(LocalDateTime.now().plusHours(24));
            staffInvitationRepository.save(invitation);

            String activationUrl = buildActivationUrl(token);
            String subject = "Staff Invitation (Renewed) | Derma Aline Aesthétics Clinic";
            String body = "Dear " + invitation.getFullName() + ",\n\n"
                    + "Your onboarding link for Derma Aline Aesthétics Skin Clinic has been renewed.\n\n"
                    + "Please click the link below to activate your staff workspace:\n"
                    + activationUrl + "\n\n"
                    + "This link is valid for 24 hours and contains no passwords.\n\n"
                    + "Derma Aline Clinic Administration";

            boolean sent = emailService.sendEmail(invitation.getEmail(), subject, body);
            auditLogService.record("STAFF_INVITATION_RESENT", getActorEmail(), "ADMIN", "STAFF_INVITATION", invitation.getEmail(), "Invitation link renewed (emailDispatched=" + sent + ")");

            if (!sent) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Invitation link renewed, but email delivery failed right now. Please check email settings."
                ));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Invitation resent to " + invitation.getEmail()));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Invitation not found.")));
    }

    @PatchMapping("/members/{id}/status")
    @Transactional
    public ResponseEntity<?> toggleMemberStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != User.Role.STAFF) {
                return ResponseEntity.status(403).body(Map.of("success", false, "message", "Can only modify staff account status."));
            }
            String newStatusStr = payload != null ? payload.get("status") : null;
            if (newStatusStr != null) {
                try {
                    User.AccountStatus nextStatus = User.AccountStatus.valueOf(newStatusStr.trim().toUpperCase());
                    user.setStatus(nextStatus);
                    if (nextStatus != User.AccountStatus.ACTIVE) {
                        user.incrementTokenVersion();
                    }
                    userRepository.save(user);

                    if (user.getEmail() != null) {
                        staffInvitationRepository.findByEmail(user.getEmail().trim().toLowerCase()).ifPresent(inv -> {
                            inv.setStatus(nextStatus == User.AccountStatus.DISABLED
                                    ? StaffInvitation.InvitationStatus.DISABLED
                                    : (nextStatus == User.AccountStatus.ACTIVE
                                        ? StaffInvitation.InvitationStatus.ACTIVE
                                        : StaffInvitation.InvitationStatus.INVITED));
                            staffInvitationRepository.save(inv);
                        });
                    }

                    auditLogService.record("STAFF_STATUS_CHANGED", getActorEmail(), "ADMIN", "USER", user.getEmail(), "Account status updated to " + user.getStatus());
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
    @Transactional
    public ResponseEntity<?> deleteInvitation(@PathVariable Long id) {
        Optional<StaffInvitation> invitationOpt = staffInvitationRepository.findById(id);
        if (invitationOpt.isPresent()) {
            StaffInvitation invitation = invitationOpt.get();
            String email = invitation.getEmail();
            staffInvitationRepository.delete(invitation);
            if (email != null && !email.trim().isEmpty()) {
                String cleanEmail = email.trim().toLowerCase();
                userRepository.findByEmail(cleanEmail).ifPresent(user -> {
                    if (user.getRole() == User.Role.STAFF) {
                        userRepository.delete(user);
                    }
                });
                if (emailVerificationOtpRepository != null) {
                    emailVerificationOtpRepository.deleteByEmail(cleanEmail);
                }
            }
            auditLogService.record("STAFF_INVITATION_DELETED", getActorEmail(), "ADMIN", "STAFF_INVITATION", email != null ? email : id.toString(), "Staff invitation revoked and removed");
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
                    String cleanEmail = email.trim().toLowerCase();
                    staffInvitationRepository.findByEmail(cleanEmail).ifPresent(staffInvitationRepository::delete);
                    if (emailVerificationOtpRepository != null) {
                        emailVerificationOtpRepository.deleteByEmail(cleanEmail);
                    }
                }
                auditLogService.record("STAFF_DELETED", getActorEmail(), "ADMIN", "USER", email != null ? email : id.toString(), "Staff account removed permanently from salon");
                return ResponseEntity.ok(Map.of("success", true, "message", "Staff account removed from salon successfully."));
            }
        }

        return ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff invitation or account not found."));
    }

    @DeleteMapping("/members/{id}")
    @Transactional
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
                String cleanEmail = email.trim().toLowerCase();
                staffInvitationRepository.findByEmail(cleanEmail).ifPresent(staffInvitationRepository::delete);
                if (emailVerificationOtpRepository != null) {
                    emailVerificationOtpRepository.deleteByEmail(cleanEmail);
                }
            }
            auditLogService.record("STAFF_DELETED", getActorEmail(), "ADMIN", "USER", email != null ? email : id.toString(), "Staff account removed permanently from salon");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff account removed from salon successfully."));
        }

        // Fallback: If passed ID is actually an invitation ID
        Optional<StaffInvitation> invitationOpt = staffInvitationRepository.findById(id);
        if (invitationOpt.isPresent()) {
            StaffInvitation invitation = invitationOpt.get();
            String email = invitation.getEmail();
            staffInvitationRepository.delete(invitation);
            if (email != null && !email.trim().isEmpty()) {
                String cleanEmail = email.trim().toLowerCase();
                userRepository.findByEmail(cleanEmail).ifPresent(user -> {
                    if (user.getRole() == User.Role.STAFF) {
                        userRepository.delete(user);
                    }
                });
                if (emailVerificationOtpRepository != null) {
                    emailVerificationOtpRepository.deleteByEmail(cleanEmail);
                }
            }
            auditLogService.record("STAFF_INVITATION_DELETED", getActorEmail(), "ADMIN", "STAFF_INVITATION", email != null ? email : id.toString(), "Staff invitation revoked and removed");
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff invitation removed successfully."));
        }

        return ResponseEntity.status(404).body(Map.of("success", false, "message", "Staff member not found."));
    }

    private String buildActivationUrl(String token) {
        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "https://derma-aline.vercel.app";
        return base.replaceAll("/+$", "") + "/staff/activate?token=" + token;
    }
}
