package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/staff")
@CrossOrigin(origins = "*")
public class StaffManagementController {

    @Autowired
    private StaffInvitationRepository staffInvitationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

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
                    map.put("role", u.getRole().name());
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
            String initialPassword = payload.getOrDefault("password", "Staff@2026");

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
            }

            String cleanEmail = email.trim().toLowerCase();

            // 1. Create / Record Invitation
            StaffInvitation invitation = staffInvitationRepository.findByEmail(cleanEmail)
                    .orElseGet(StaffInvitation::new);
            invitation.setEmail(cleanEmail);
            invitation.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : "Clinic Staff");
            invitation.setDesignation(designation != null && !designation.trim().isEmpty() ? designation.trim() : "Skin Therapist");
            invitation.setToken(UUID.randomUUID().toString());
            invitation.setStatus(StaffInvitation.InvitationStatus.ACTIVE);
            staffInvitationRepository.save(invitation);

            // 2. Provision or update User account in database with STAFF role
            User staffUser = userRepository.findByEmail(cleanEmail).orElseGet(User::new);
            staffUser.setEmail(cleanEmail);
            staffUser.setFullName(invitation.getFullName());
            staffUser.setPassword(passwordEncoder.encode(initialPassword.trim()));
            staffUser.setRole(User.Role.STAFF);
            userRepository.save(staffUser);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Staff worker successfully created and enrolled!",
                "email", cleanEmail,
                "fullName", staffUser.getFullName(),
                "designation", invitation.getDesignation()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to enroll staff: " + e.getMessage()));
        }
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<?> deleteInvitation(@PathVariable Long id) {
        return staffInvitationRepository.findById(id).map(inv -> {
            userRepository.findByEmail(inv.getEmail()).ifPresent(user -> {
                if (user.getRole() == User.Role.STAFF) {
                    userRepository.delete(user);
                }
            });
            staffInvitationRepository.delete(inv);
            return ResponseEntity.ok(Map.of("success", true, "message", "Staff account and invitation revoked."));
        }).orElse(ResponseEntity.status(404).body(Map.of("success", false, "message", "Invitation not found")));
    }
}
