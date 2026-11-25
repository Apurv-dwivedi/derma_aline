package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.AuditLog;
import com.dermaaline.backend.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Owner Audit Trail Viewer: GET /api/admin/audit-logs
     * Returns top 50 historical operational and security audit entries.
     */
    @GetMapping
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findTop50ByOrderByTimestampDesc());
    }

    /**
     * Audit log deletion is disabled to preserve compliance integrity.
     */
    @DeleteMapping
    public ResponseEntity<?> clearAuditLogs() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
            "success", false,
            "message", "Audit logs are immutable clinical compliance records and cannot be deleted."
        ));
    }
}
