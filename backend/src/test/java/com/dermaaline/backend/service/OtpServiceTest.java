package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.EmailVerificationOtp;
import com.dermaaline.backend.repository.EmailVerificationOtpRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OtpServiceTest {

    @Mock
    private EmailVerificationOtpRepository otpRepository;

    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private EmailService emailService;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        lenient().when(emailService.sendOtpEmail(anyString(), anyString(), anyString(), anyInt())).thenReturn(true);
        lenient().when(emailService.sendPasswordResetOtpEmail(anyString(), anyString(), anyString(), anyInt())).thenReturn(true);
    }

    @Test
    void testOtpPurposeIsolationAndSingleUse() {
        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("client@example.com", OtpService.PURPOSE_PASSWORD_RESET))
                .thenReturn(Optional.empty());
        when(otpRepository.findTopByEmailOrderByCreatedAtDesc("client@example.com")).thenReturn(Optional.empty());
        when(otpRepository.save(any(EmailVerificationOtp.class))).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(otpService.generateAndSendPasswordResetOtp("client@example.com", "Client"));

        ArgumentCaptor<EmailVerificationOtp> captor = ArgumentCaptor.forClass(EmailVerificationOtp.class);
        verify(otpRepository).save(captor.capture());
        EmailVerificationOtp savedOtp = captor.getValue();
        assertEquals(OtpService.PURPOSE_PASSWORD_RESET, savedOtp.getPurpose());

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetOtpEmail(eq("client@example.com"), eq("Client"), codeCaptor.capture(), eq(5));
        String issuedCode = codeCaptor.getValue();

        // Wrong purpose must fail even with valid code
        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("client@example.com", OtpService.PURPOSE_REGISTRATION))
                .thenReturn(Optional.empty());
        assertFalse(otpService.verifyOtpForPurpose("client@example.com", issuedCode, OtpService.PURPOSE_REGISTRATION));

        // Correct purpose succeeds once, then single-use blocks reuse
        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("client@example.com", OtpService.PURPOSE_PASSWORD_RESET))
                .thenReturn(Optional.of(savedOtp));
        assertTrue(otpService.verifyOtpForPurpose("client@example.com", issuedCode, OtpService.PURPOSE_PASSWORD_RESET));
        assertTrue(savedOtp.isVerified());
        assertFalse(otpService.verifyOtpForPurpose("client@example.com", issuedCode, OtpService.PURPOSE_PASSWORD_RESET));
    }

    @Test
    void testOtpMaxAttemptsAndExpiryEnforcement() {
        EmailVerificationOtp record = new EmailVerificationOtp();
        record.setEmail("client@example.com");
        record.setPurpose(OtpService.PURPOSE_REGISTRATION);
        record.setOtpHash(passwordEncoder.encode("654321"));
        record.setExpiresAt(LocalDateTime.now().plusMinutes(4));
        record.setAttempts(5);
        record.setVerified(false);

        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("client@example.com", OtpService.PURPOSE_REGISTRATION))
                .thenReturn(Optional.of(record));

        assertFalse(otpService.verifyOtpForPurpose("client@example.com", "654321", OtpService.PURPOSE_REGISTRATION));

        record.setAttempts(0);
        record.setExpiresAt(LocalDateTime.now().minusSeconds(10));
        assertFalse(otpService.verifyOtpForPurpose("client@example.com", "654321", OtpService.PURPOSE_REGISTRATION));
    }

    @Test
    void testOtpResendCooldownEnforced() {
        EmailVerificationOtp recent = new EmailVerificationOtp();
        recent.setEmail("client@example.com");
        recent.setPurpose(OtpService.PURPOSE_REGISTRATION);
        recent.setCreatedAt(LocalDateTime.now().minusSeconds(15));

        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("client@example.com", OtpService.PURPOSE_REGISTRATION))
                .thenReturn(Optional.of(recent));

        assertThrows(IllegalStateException.class, () ->
                otpService.generateAndSendOtp("client@example.com", "Client"));
    }

    @Test
    void testFailedOtpDeliveryDeletesRecordToPreventCooldownLockout() {
        when(otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc("fail@example.com", OtpService.PURPOSE_REGISTRATION))
                .thenReturn(Optional.empty());
        when(otpRepository.findTopByEmailOrderByCreatedAtDesc("fail@example.com")).thenReturn(Optional.empty());
        when(otpRepository.save(any(EmailVerificationOtp.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendOtpEmail(eq("fail@example.com"), eq("Fail Client"), anyString(), eq(5))).thenReturn(false);

        boolean result = otpService.generateAndSendOtp("fail@example.com", "Fail Client");

        assertFalse(result);
        verify(otpRepository, times(1)).delete(any(EmailVerificationOtp.class));
    }
}
