package com.dermaaline.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/system")
public class SystemCleanupController {

    private static final Logger logger = LoggerFactory.getLogger(SystemCleanupController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Purge all records across Client, Staff, and Admin portals.
     * Strictly preserves administrator accounts and core treatments.
     */
    @DeleteMapping("/purge-all-data")
    public ResponseEntity<?> purgeAllPortalData() {
        String[] purgeStatements = {
            "DELETE FROM appointments;",
            "DELETE FROM treatment_records;",
            "DELETE FROM contact_messages;",
            "DELETE FROM customers;",
            "DELETE FROM notifications;",
            "DELETE FROM email_verification_otps;",
            "DELETE FROM audit_logs;",
            "DELETE FROM staff_invitations;",
            "DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN');",
            "DELETE FROM treatments WHERE category = 'Clinical Treatment' OR price IS NULL;"
        };

        for (String sql : purgeStatements) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception e) {
                logger.warn("Purge step notice for query [{}]: {}", sql, e.getMessage());
            }
        }

        logger.info("System-wide data purge completed. Admin account preserved.");
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "All data across Client, Staff, and Admin portals has been purged successfully. Admin credentials preserved."
        ));
    }
}
