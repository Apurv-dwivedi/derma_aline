package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.AuditLog;
import com.dermaaline.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Records a secure audit log entry for administrative & operational visibility.
     * Ensures audit logging never crashes the primary transaction.
     */
    public void record(String action, String performedBy, String role, String targetEntity, String targetId, String details) {
        try {
            AuditLog log = new AuditLog();
            log.setAction(action);
            log.setPerformedBy(performedBy != null ? performedBy.trim().toLowerCase() : "system");
            log.setRole(role != null ? role.toUpperCase() : "SYSTEM");
            log.setTargetEntity(targetEntity);
            log.setTargetId(targetId);
            log.setDetails(details);
            log.setTimestamp(LocalDateTime.now());

            auditLogRepository.save(log);
            logger.info("AUDIT: [{}] by [{} ({})] on [{} ID: {}] - {}", action, performedBy, role, targetEntity, targetId, details);
        } catch (Exception e) {
            logger.error("Failed to persist audit log entry: {}", e.getMessage());
        }
    }
}
