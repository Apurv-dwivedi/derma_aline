package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.AuditLog;
import com.dermaaline.backend.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Owner Audit Trail Viewer: GET /api/admin/audit-logs
     * Returns top 100 historical operational and security audit entries.
     */
    @GetMapping
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findTop50ByOrderByTimestampDesc());
    }

    /**
     * Clear Audit Trail: DELETE /api/admin/audit-logs
     */
    @DeleteMapping
    public ResponseEntity<?> clearAuditLogs() {
        auditLogRepository.deleteAll();
        return ResponseEntity.ok(Map.of("success", true, "message", "All audit logs have been purged successfully."));
    }
}
