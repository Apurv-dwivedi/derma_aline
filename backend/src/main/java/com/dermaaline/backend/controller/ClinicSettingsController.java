package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ClinicSettings;
import com.dermaaline.backend.repository.ClinicSettingsRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class ClinicSettingsController {

    @Autowired
    private ClinicSettingsRepository settingsRepository;

    @Autowired
    private com.dermaaline.backend.service.AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<ClinicSettings> getSettings() {
        ClinicSettings settings = settingsRepository.findAll().stream().findFirst()
                .orElseGet(() -> settingsRepository.save(new ClinicSettings()));
        return ResponseEntity.ok(settings);
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody ClinicSettings incoming) {
        if (incoming == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Settings payload is required."));
        }
        ClinicSettings settings = settingsRepository.findAll().stream().findFirst()
                .orElseGet(ClinicSettings::new);

        if (incoming.getClinicName() != null) settings.setClinicName(SecuritySanitizer.sanitizeText(incoming.getClinicName(), 150));
        if (incoming.getContactEmail() != null) {
            String cleanEmail = SecuritySanitizer.sanitizeEmail(incoming.getContactEmail());
            if (cleanEmail == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid clinic contact email."));
            }
            settings.setContactEmail(cleanEmail);
        }
        if (incoming.getContactPhone() != null) {
            String cleanPhone = SecuritySanitizer.sanitizePhone(incoming.getContactPhone());
            if (cleanPhone == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid clinic phone format."));
            }
            settings.setContactPhone(cleanPhone);
        }
        if (incoming.getAddress() != null) settings.setAddress(SecuritySanitizer.sanitizeText(incoming.getAddress(), 500));
        if (incoming.getOpeningHours() != null) settings.setOpeningHours(SecuritySanitizer.sanitizeText(incoming.getOpeningHours(), 200));
        if (incoming.getGeneralInformation() != null) settings.setGeneralInformation(SecuritySanitizer.sanitizeText(incoming.getGeneralInformation(), 2000));
        settings.setUpdatedAt(LocalDateTime.now());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actor = (auth != null && auth.getName() != null) ? auth.getName() : "admin";
        ClinicSettings saved = settingsRepository.save(settings);
        auditLogService.record("SETTINGS_UPDATED", actor, "ADMIN", "CLINIC_SETTINGS", "1", "Clinic operational parameters updated");
        return ResponseEntity.ok(Map.of("success", true, "message", "Clinic settings updated.", "settings", saved));
    }
}
