package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.StaffInvitation;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/staff")
@CrossOrigin(origins = "*")
public class StaffManagementController {

    @Autowired
    private StaffInvitationRepository staffInvitationRepository;

    @GetMapping("/invitations")
    public ResponseEntity<List<StaffInvitation>> getAllInvitations() {
        return ResponseEntity.ok(staffInvitationRepository.findAll());
    }

    @PostMapping("/invitations")
    public ResponseEntity<?> sendStaffInvitation(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            String fullName = payload.get("fullName");
            String designation = payload.get("designation");

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
            }

            if (staffInvitationRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Staff with this email is already invited or registered"));
            }

            StaffInvitation invitation = new StaffInvitation();
            invitation.setEmail(email);
            invitation.setFullName(fullName != null ? fullName : "Clinic Staff");
            invitation.setDesignation(designation != null ? designation : "Skin Therapist");
            invitation.setToken(UUID.randomUUID().toString());

            staffInvitationRepository.save(invitation);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Staff invitation created successfully!",
                "invitationToken", invitation.getToken() // In production, this is sent via email
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}