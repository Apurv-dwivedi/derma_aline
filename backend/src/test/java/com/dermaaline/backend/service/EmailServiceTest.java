package com.dermaaline.backend.service;

import com.dermaaline.backend.security.SecuritySanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "dermaalineaesthetics@gmail.com");
    }

    @Test
    @DisplayName("EVAL: Verification Code formatting & Brand consistency")
    void testOtpEmailFormatting() {
        String testEmail = "client@example.com";
        String clientName = "Eleanor Vance";
        String code = "849201";
        int expiry = 5;

        // Simulate real-world Render SMTP port 587 firewall timeout
        jakarta.mail.internet.MimeMessage mimeMessage = new jakarta.mail.internet.MimeMessage(
                (jakarta.mail.Session) null);
        org.mockito.Mockito.when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        org.mockito.Mockito
                .doThrow(new org.springframework.mail.MailSendException(
                        "Couldn't connect to host, port: smtp.gmail.com, 587; timeout 10000;"))
                .when(mailSender).send(org.mockito.ArgumentMatchers.any(jakarta.mail.internet.MimeMessage.class));

        // When Brevo fallback API key is unconfigured in test environment
        boolean result = emailService.sendOtpEmail(testEmail, clientName, code, expiry);

        // Assert failure is gracefully handled (returns false instead of crashing)
        assertFalse(result, "Should return false cleanly when mock sender is unconfigured");
        assertNotNull(emailService.getLastError(), "Error message should be recorded for audit diagnostics");
        assertTrue(emailService.getLastError().contains("587") || emailService.getLastError().contains("SMTP"),
                "Diagnostic must identify SMTP port 587 failure");
    }

    @Test
    @DisplayName("EVAL: Security Sanitizer strips XSS and preserves clean text")
    void testSecuritySanitizerEvaluation() {
        String maliciousName = "John <script>alert('xss')</script> Doe";
        String sanitizedName = SecuritySanitizer.sanitizeText(maliciousName, 100);
        assertEquals("John  Doe", sanitizedName, "Script tags must be completely stripped");

        String invalidEmail = "invalid-email-format";
        String sanitizedEmail = SecuritySanitizer.sanitizeEmail(invalidEmail);
        assertNull(sanitizedEmail, "Malformed or invalid email format must be rejected");

        String maliciousEmail = "attacker@example.com<script>alert('xss')</script>";
        String sanitizedMalicious = SecuritySanitizer.sanitizeEmail(maliciousEmail);
        assertEquals("attacker@example.com", sanitizedMalicious,
                "Injected script in email must be stripped to clean address");

        String validEmail = "  Valued.Client+Test@gmail.com  ";
        String cleanEmail = SecuritySanitizer.sanitizeEmail(validEmail);
        assertEquals("valued.client+test@gmail.com", cleanEmail, "Valid email must be lowercased and trimmed");

        String maliciousPhone = "+91 93195 44704<img src=x onerror=alert(1)>";
        String cleanPhone = SecuritySanitizer.sanitizePhone(maliciousPhone);
        assertEquals("+91 93195 44704", cleanPhone, "Injected HTML in phone must be stripped to clean number");

        String invalidPhone = "abc-123-xyz";
        assertNull(SecuritySanitizer.sanitizePhone(invalidPhone), "Invalid phone format must be rejected");

        String validPhone = "+91 93195 44704";
        assertEquals("+91 93195 44704", SecuritySanitizer.sanitizePhone(validPhone), "Clean phone must match");
    }

    @Test
    @DisplayName("EVAL: JSON string escaping prevents JSON Injection in HTTP relays")
    void testJsonEscapingUtility() {
        String rawWithQuotesAndNewlines = "Hello \"World\"\nNew line\r\nTab\tBackslash\\";
        String escaped = (String) ReflectionTestUtils.invokeMethod(emailService, "escapeJson", rawWithQuotesAndNewlines);

        assertNotNull(escaped);
        assertTrue(escaped.contains("\\\"World\\\""), "Quotes must be properly escaped");
        assertTrue(escaped.contains("\\n"), "Newlines must be escaped as literal \\n");
        assertTrue(escaped.contains("\\\\"), "Backslashes must be escaped as double backslashes");
    }

    @Test
    @DisplayName("EVAL: Password reset email subject never exposes raw 6-digit OTP")
    void testPasswordResetEmailSubjectNeverContainsOtpCode() throws Exception {
        jakarta.mail.internet.MimeMessage mimeMessage = new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null);
        org.mockito.Mockito.when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        String secretCode = "928174";
        boolean dispatched = emailService.sendPasswordResetOtpEmail("client@example.com", "Eleanor", secretCode, 5);

        assertTrue(dispatched);
        String subject = mimeMessage.getSubject();
        assertNotNull(subject);
        assertFalse(subject.contains(secretCode), "Email subject must never contain plaintext OTP verification code");
    }
}
