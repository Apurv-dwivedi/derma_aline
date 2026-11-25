package com.dermaaline.backend.controller;

import com.dermaaline.backend.service.AuditLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/system")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class SystemCleanupController {

    private static final Logger logger = LoggerFactory.getLogger(SystemCleanupController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired(required = false)
    private AuditLogService auditLogService;

    /**
     * Purge operational portal records across Client, Staff, and Admin portals.
     * Strictly preserves audit logs, administrator accounts, and core treatments.
     * Executes atomically: any SQL failure rolls back the entire transaction.
     */
    @DeleteMapping("/purge-all-data")
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> purgeAllPortalData(@RequestParam(value = "confirm", required = false) String confirm) {
        if (!"PURGE_ALL_PORTAL_DATA".equals(confirm)) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Explicit confirmation token is required to purge portal records."
            ));
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actor = (auth != null && auth.getName() != null) ? auth.getName() : "admin";
        String[] purgeStatements = {
            "DELETE FROM appointments",
            "DELETE FROM appointment_slot_locks",
            "DELETE FROM treatment_records",
            "DELETE FROM contact_messages",
            "DELETE FROM customers",
            "DELETE FROM notifications",
            "DELETE FROM email_verification_otps",
            "DELETE FROM staff_invitations",
            "DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN')",
            "DELETE FROM treatments WHERE category = 'Clinical Treatment' OR price IS NULL"
        };

        try {
            for (String sql : purgeStatements) {
                jdbcTemplate.execute(sql);
            }
        } catch (Exception e) {
            logger.error("System-wide data purge failed; rolling back transaction: {}", e.getMessage());
            try {
                TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            } catch (Exception ignored) {}
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "System data purge failed and all changes were rolled back safely."
            ));
        }

        if (auditLogService != null) {
            auditLogService.record(
                "SYSTEM_PORTAL_PURGE",
                actor,
                "ADMIN",
                "SYSTEM",
                "PORTAL_DATA",
                "Operational portal data purged; audit logs and clinic admin accounts preserved"
            );
        }

        logger.info("System-wide operational purge completed by {}. Audit logs and admin accounts preserved.", actor);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Operational data across Client, Staff, and Admin portals has been purged successfully. Audit logs and admin credentials were preserved."
        ));
    }
}
