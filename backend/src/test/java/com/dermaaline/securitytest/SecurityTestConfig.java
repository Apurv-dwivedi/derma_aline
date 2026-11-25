package com.dermaaline.securitytest;

import com.dermaaline.backend.config.SecurityConfig;
import com.dermaaline.backend.controller.AppointmentController;
import com.dermaaline.backend.controller.AuditLogController;
import com.dermaaline.backend.controller.ClientPortalController;
import com.dermaaline.backend.controller.ContactController;
import com.dermaaline.backend.controller.CustomerController;
import com.dermaaline.backend.controller.ReportController;
import com.dermaaline.backend.controller.StaffManagementController;
import com.dermaaline.backend.controller.StaffPortalController;
import com.dermaaline.backend.controller.SystemCleanupController;
import com.dermaaline.backend.controller.TreatmentController;
import com.dermaaline.backend.repository.AppointmentRepository;
import com.dermaaline.backend.repository.AuditLogRepository;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.NotificationRepository;
import com.dermaaline.backend.repository.StaffInvitationRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.dermaaline.backend.repository.UserRepository;
import com.dermaaline.backend.security.CustomUserDetailsService;
import com.dermaaline.backend.security.JwtAuthenticationFilter;
import com.dermaaline.backend.security.JwtTokenProvider;
import com.dermaaline.backend.security.RateLimitingFilter;
import com.dermaaline.backend.service.AppointmentBookingService;
import com.dermaaline.backend.service.AuditLogService;
import com.dermaaline.backend.service.EmailService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.mockito.Mockito.mock;

/**
 * Isolated Spring Security MockMvc test configuration placed intentionally
 * outside com.dermaaline.backend so @SpringBootApplication component scanning
 * in BackendApplicationTests never loads mock repository beans.
 */
@Configuration
@EnableWebMvc
@Import({
        SecurityConfig.class,
        JwtTokenProvider.class,
        JwtAuthenticationFilter.class,
        CustomUserDetailsService.class,
        RateLimitingFilter.class,
        CustomerController.class,
        ClientPortalController.class,
        StaffPortalController.class,
        AppointmentController.class,
        TreatmentController.class,
        ContactController.class,
        ReportController.class,
        AuditLogController.class,
        SystemCleanupController.class,
        StaffManagementController.class
})
public class SecurityTestConfig {
    @Bean public UserRepository userRepository() { return mock(UserRepository.class); }
    @Bean public CustomerRepository customerRepository() { return mock(CustomerRepository.class); }
    @Bean public TreatmentRecordRepository treatmentRecordRepository() { return mock(TreatmentRecordRepository.class); }
    @Bean public TreatmentRepository treatmentRepository() { return mock(TreatmentRepository.class); }
    @Bean public AppointmentRepository appointmentRepository() { return mock(AppointmentRepository.class); }
    @Bean public ContactRepository contactRepository() { return mock(ContactRepository.class); }
    @Bean public NotificationRepository notificationRepository() { return mock(NotificationRepository.class); }
    @Bean public StaffInvitationRepository staffInvitationRepository() { return mock(StaffInvitationRepository.class); }
    @Bean public AuditLogRepository auditLogRepository() { return mock(AuditLogRepository.class); }
    @Bean public AppointmentBookingService appointmentBookingService() { return mock(AppointmentBookingService.class); }
    @Bean public AuditLogService auditLogService() { return mock(AuditLogService.class); }
    @Bean public EmailService emailService() { return mock(EmailService.class); }
    @Bean public JdbcTemplate jdbcTemplate() { return mock(JdbcTemplate.class); }
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
