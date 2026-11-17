package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ClinicSettings;
import com.dermaaline.backend.repository.ClinicSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@CrossOrigin(origins = "*")
public class ClinicSettingsController {

    @Autowired
    private ClinicSettingsRepository settingsRepository;

    @GetMapping
    public ResponseEntity<ClinicSettings> getSettings() {
        ClinicSettings settings = settingsRepository.findAll().stream().findFirst()
                .orElseGet(() -> settingsRepository.save(new ClinicSettings()));
        return ResponseEntity.ok(settings);
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody ClinicSettings incoming) {
        ClinicSettings settings = settingsRepository.findAll().stream().findFirst()
                .orElseGet(ClinicSettings::new);

        if (incoming.getClinicName() != null) settings.setClinicName(incoming.getClinicName().trim());
        if (incoming.getContactEmail() != null) settings.setContactEmail(incoming.getContactEmail().trim());
        if (incoming.getContactPhone() != null) settings.setContactPhone(incoming.getContactPhone().trim());
        if (incoming.getAddress() != null) settings.setAddress(incoming.getAddress().trim());
        if (incoming.getOpeningHours() != null) settings.setOpeningHours(incoming.getOpeningHours().trim());
        if (incoming.getGeneralInformation() != null) settings.setGeneralInformation(incoming.getGeneralInformation().trim());
        settings.setUpdatedAt(LocalDateTime.now());

        ClinicSettings saved = settingsRepository.save(settings);
        return ResponseEntity.ok(Map.of("success", true, "message", "Clinic settings updated.", "settings", saved));
    }
}
