package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.AppointmentSlotLock;
import com.dermaaline.backend.repository.AppointmentSlotLockRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Locale;

/**
 * Manages persistent slot-lock rows in PostgreSQL (and H2 PostgreSQL mode in tests)
 * so concurrent booking requests across multiple backend instances synchronize cleanly
 * on a database row lock even before any appointment row exists for a slot.
 */
@Service
public class AppointmentSlotLockService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired
    private AppointmentSlotLockRepository slotLockRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureSlotLockExists(String slotKey) {
        if (slotKey == null || slotKey.isBlank()) {
            return;
        }
        String productName = "";
        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection()) {
                if (conn.getMetaData() != null && conn.getMetaData().getDatabaseProductName() != null) {
                    productName = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ENGLISH);
                }
            } catch (Exception ignored) {}
        }

        if (productName.contains("postgresql")) {
            entityManager.createNativeQuery(
                "INSERT INTO appointment_slot_locks (slot_key, created_at) VALUES (?1, CURRENT_TIMESTAMP) ON CONFLICT (slot_key) DO NOTHING"
            ).setParameter(1, slotKey).executeUpdate();
            return;
        }

        if (productName.contains("h2")) {
            entityManager.createNativeQuery(
                "MERGE INTO appointment_slot_locks (slot_key, created_at) KEY (slot_key) VALUES (?1, CURRENT_TIMESTAMP)"
            ).setParameter(1, slotKey).executeUpdate();
            return;
        }

        if (!slotLockRepository.existsById(slotKey)) {
            try {
                slotLockRepository.saveAndFlush(new AppointmentSlotLock(slotKey));
            } catch (DataIntegrityViolationException ignored) {
                // Another instance inserted the slot lock concurrently
            }
        }
    }
}
