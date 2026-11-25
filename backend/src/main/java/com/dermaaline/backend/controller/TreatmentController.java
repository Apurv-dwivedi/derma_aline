package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private static final Logger logger = LoggerFactory.getLogger(TreatmentController.class);

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private com.dermaaline.backend.service.AuditLogService auditLogService;

    private String getActorEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "admin";
    }

    @GetMapping
    public ResponseEntity<List<Treatment>> getAllTreatments() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=120, stale-while-revalidate=300")
                .body(treatmentRepository.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Treatment>> getActiveTreatments() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=120, stale-while-revalidate=300")
                .body(treatmentRepository.findByActiveTrue());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createTreatment(@RequestBody Treatment treatment) {
        if (treatment == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment payload is required."));
        }
        String name = SecuritySanitizer.sanitizeText(treatment.getName(), 150);
        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment name is required."));
        }
        String category = SecuritySanitizer.sanitizeText(treatment.getCategory(), 100);
        String description = SecuritySanitizer.sanitizeText(treatment.getDescription(), 2000);
        Double price = treatment.getPrice();
        if (price != null && (Double.isNaN(price) || Double.isInfinite(price) || price < 0)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Price must be a non-negative number."));
        }
        String imageUrl = treatment.getImageUrl() != null ? SecuritySanitizer.sanitizeImageUrl(treatment.getImageUrl(), 200000) : null;
        if (treatment.getImageUrl() != null && !treatment.getImageUrl().trim().isEmpty() && imageUrl == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid image URL format."));
        }
        Integer durationObj = treatment.getDurationMinutes();
        int duration = durationObj != null ? durationObj : 45;
        if (duration < 5 || duration > 480) {
            duration = 45;
        }
        try {
            treatment.setName(name);
            treatment.setCategory(category != null && !category.isEmpty() ? category : "Clinical Treatment");
            treatment.setDescription(description);
            treatment.setPrice(price);
            treatment.setDurationMinutes(duration);
            if (imageUrl != null) {
                treatment.setImageUrl(imageUrl);
            }
            Treatment saved = treatmentRepository.save(treatment);
            if (auditLogService != null) {
                auditLogService.record("TREATMENT_CREATED", getActorEmail(), "ADMIN", "TREATMENT", saved.getId().toString(), "Created treatment section entry: " + saved.getName());
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Treatment created successfully", "id", saved.getId()));
        } catch (Exception e) {
            logger.error("Failed to create treatment", e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Failed to create treatment."));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateTreatment(@PathVariable Long id, @RequestBody Treatment details) {
        if (details == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment details are required."));
        }
        Optional<Treatment> opt = treatmentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Treatment not found"));
        }
        String name = SecuritySanitizer.sanitizeText(details.getName(), 150);
        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Treatment name is required."));
        }
        Double price = details.getPrice();
        if (price != null && (Double.isNaN(price) || Double.isInfinite(price) || price < 0)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Price must be a non-negative number."));
        }
        Treatment t = opt.get();
        t.setName(name);
        t.setCategory(SecuritySanitizer.sanitizeText(details.getCategory(), 100));
        t.setDescription(SecuritySanitizer.sanitizeText(details.getDescription(), 2000));
        t.setPrice(price);
        Integer duration = details.getDurationMinutes();
        t.setDurationMinutes((duration != null && duration >= 5 && duration <= 480) ? duration : t.getDurationMinutes());
        t.setActive(details.isActive());
        if (details.getImageUrl() != null) {
            String safeImg = SecuritySanitizer.sanitizeImageUrl(details.getImageUrl(), 200000);
            if (safeImg == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid image URL format."));
            }
            t.setImageUrl(safeImg);
        }

        treatmentRepository.save(t);
        if (auditLogService != null) {
            auditLogService.record("TREATMENT_UPDATED", getActorEmail(), "ADMIN", "TREATMENT", id.toString(), "Updated treatment details for: " + t.getName());
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Treatment updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteTreatment(@PathVariable Long id) {
        if (!treatmentRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Treatment not found"));
        }
        treatmentRepository.deleteById(id);
        if (auditLogService != null) {
            auditLogService.record("TREATMENT_DELETED", getActorEmail(), "ADMIN", "TREATMENT", id.toString(), "Deleted treatment ID: " + id);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Treatment deleted successfully"));
    }
}