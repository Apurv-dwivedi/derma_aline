package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Appointment;
import com.dermaaline.backend.entity.AuditLog;
import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.AuditLogRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import derma_aline.BackendApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = BackendApplication.class)
@ActiveProfiles("test")
public class SystemCleanupAndAuditIntegrationTest {

    @Autowired
    private SystemCleanupController systemCleanupController;

    @Autowired
    private AuditLogController auditLogController;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private JdbcTemplate realJdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        appointmentRepository.deleteAll();
        customerRepository.deleteAll();
        auditLogRepository.deleteAll();
    }

    private void authenticateAsAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "owner@dermaaline.com",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                )
        );
    }

    @Test
    void testPurgeAllPortalDataPreservesAuditLogsAndAuditDeleteEndpointRemainsBlocked() {
        AuditLog existingLog = new AuditLog();
        existingLog.setAction("SECURITY_EVENT");
        existingLog.setPerformedBy("owner@dermaaline.com");
        existingLog.setRole("ADMIN");
        existingLog.setTargetEntity("SYSTEM");
        existingLog.setTargetId("1");
        existingLog.setDetails("Compliance baseline entry");
        auditLogRepository.save(existingLog);

        Customer c = new Customer();
        c.setFullName("Temp Customer");
        c.setEmail("temp.cleanup@example.com");
        c.setPhone("9876543210");
        customerRepository.save(c);

        Appointment a = new Appointment();
        a.setCustomerName("Temp Customer");
        a.setCustomerEmail("temp.cleanup@example.com");
        a.setTreatmentName("HydraFacial Glow");
        a.setAppointmentDate(LocalDateTime.now().plusDays(2));
        a.setAppointmentTime("11:00 AM");
        a.setStatus("PENDING");
        appointmentRepository.save(a);

        authenticateAsAdmin();
        try {
            ResponseEntity<?> purgeResponse = systemCleanupController.purgeAllPortalData("PURGE_ALL_PORTAL_DATA");
            assertEquals(HttpStatus.OK, purgeResponse.getStatusCode());

            assertEquals(0, customerRepository.count(), "Customers must be purged");
            assertEquals(0, appointmentRepository.count(), "Appointments must be purged");
            assertTrue(auditLogRepository.count() >= 2,
                    "Prior compliance audit logs must be preserved and SYSTEM_PORTAL_PURGE recorded");

            // Attempt to wipe audit logs must be rejected
            ResponseEntity<?> clearResponse = auditLogController.clearAuditLogs();
            assertEquals(HttpStatus.FORBIDDEN, clearResponse.getStatusCode());
            assertTrue(auditLogRepository.count() >= 2);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void testPurgePartialFailureRollsBackRealDatabaseTransactionAndReturns500() {
        Customer c = new Customer();
        c.setFullName("Rollback Protected");
        c.setEmail("rollback@example.com");
        c.setPhone("9876543210");
        customerRepository.save(c);

        Appointment a = new Appointment();
        a.setCustomerName("Rollback Protected");
        a.setCustomerEmail("rollback@example.com");
        a.setTreatmentName("HydraFacial Glow");
        a.setAppointmentDate(LocalDateTime.now().plusDays(2));
        a.setAppointmentTime("11:00 AM");
        a.setStatus("PENDING");
        appointmentRepository.save(a);

        SystemCleanupController targetController = AopTestUtils.getTargetObject(systemCleanupController);
        JdbcTemplate failingMidTxJdbc = Mockito.spy(new JdbcTemplate(dataSource));
        Mockito.doThrow(new RuntimeException("Simulated SQL failure mid-purge")).when(failingMidTxJdbc).execute("DELETE FROM contact_messages");

        ReflectionTestUtils.setField(targetController, "jdbcTemplate", failingMidTxJdbc);
        authenticateAsAdmin();
        try {
            ResponseEntity<?> response = systemCleanupController.purgeAllPortalData("PURGE_ALL_PORTAL_DATA");
            assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
            assertEquals(1, appointmentRepository.count(), "Earlier DELETE FROM appointments must roll back cleanly on later step failure");
            assertEquals(1, customerRepository.count(), "Customers must remain intact after rollback");
        } finally {
            ReflectionTestUtils.setField(targetController, "jdbcTemplate", realJdbcTemplate);
            SecurityContextHolder.clearContext();
        }
    }
}
