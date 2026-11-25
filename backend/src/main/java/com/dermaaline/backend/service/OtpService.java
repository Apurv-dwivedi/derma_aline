package com.dermaaline.backend.service;

import com.dermaaline.backend.entity.EmailVerificationOtp;
import com.dermaaline.backend.repository.EmailVerificationOtpRepository;
import com.dermaaline.backend.security.SecuritySanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final Logger logger = LoggerFactory.getLogger(OtpService.class);
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    public static final String PURPOSE_REGISTRATION = "REGISTRATION";
    public static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String PURPOSE_PASSWORD_CHANGE = "PASSWORD_CHANGE";

    @Autowired
    private EmailVerificationOtpRepository otpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates, stores, and emails a secure 6-digit registration verification OTP.
     */
    @Transactional
    public boolean generateAndSendOtp(String email, String fullName) {
        String cleanEmail = email.trim().toLowerCase();
        GeneratedOtp generated = createAndStoreOtp(cleanEmail, PURPOSE_REGISTRATION);
        boolean sent = emailService.sendOtpEmail(cleanEmail, fullName, generated.code(), OTP_EXPIRY_MINUTES);
        if (!sent) {
            cleanupFailedOtp(generated.record());
            logger.warn("Failed to dispatch OTP email to {}", SecuritySanitizer.maskEmail(cleanEmail));
        }
        return sent;
    }

    /**
     * Generates, stores, and emails a confidential 6-digit password reset OTP (Zero links).
     */
    @Transactional
    public boolean generateAndSendPasswordResetOtp(String email, String fullName) {
        String cleanEmail = email.trim().toLowerCase();
        GeneratedOtp generated = createAndStoreOtp(cleanEmail, PURPOSE_PASSWORD_RESET);
        boolean sent = emailService.sendPasswordResetOtpEmail(cleanEmail, fullName, generated.code(), OTP_EXPIRY_MINUTES);
        if (!sent) {
            cleanupFailedOtp(generated.record());
            logger.warn("Failed to dispatch password reset OTP email to {}", SecuritySanitizer.maskEmail(cleanEmail));
        }
        return sent;
    }

    /**
     * Generates, stores, and emails a confidential 6-digit password change OTP for personnel.
     */
    @Transactional
    public boolean generateAndSendPasswordChangeOtp(String email, String fullName) {
        String cleanEmail = email.trim().toLowerCase();
        GeneratedOtp generated = createAndStoreOtp(cleanEmail, PURPOSE_PASSWORD_CHANGE);
        boolean sent = emailService.sendOtpEmail(cleanEmail, fullName, generated.code(), OTP_EXPIRY_MINUTES);
        if (!sent) {
            cleanupFailedOtp(generated.record());
            logger.warn("Failed to dispatch password change OTP email to {}", SecuritySanitizer.maskEmail(cleanEmail));
        }
        return sent;
    }

    private void cleanupFailedOtp(EmailVerificationOtp record) {
        if (record != null) {
            otpRepository.delete(record);
        }
    }

    private record GeneratedOtp(EmailVerificationOtp record, String code) {}

    private GeneratedOtp createAndStoreOtp(String cleanEmail, String purpose) {
        Optional<EmailVerificationOtp> latestOpt = otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(cleanEmail, purpose);
        if (latestOpt.isEmpty()) {
            latestOpt = otpRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);
        }
        if (latestOpt.isPresent()) {
            EmailVerificationOtp latest = latestOpt.get();
            if (latest.getCreatedAt() != null
                    && latest.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                logger.warn("OTP resend requested within cooldown period for {} [{}]", SecuritySanitizer.maskEmail(cleanEmail), purpose);
                throw new IllegalStateException("Please wait " + RESEND_COOLDOWN_SECONDS + " seconds before requesting a new code.");
            }
        }

        int code = 100000 + secureRandom.nextInt(900000);
        String codeStr = String.valueOf(code);

        EmailVerificationOtp record = new EmailVerificationOtp();
        record.setEmail(cleanEmail);
        record.setPurpose(purpose);
        record.setOtpHash(passwordEncoder.encode(codeStr));
        record.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        record.setAttempts(0);
        record.setVerified(false);
        record.setCreatedAt(LocalDateTime.now());
        EmailVerificationOtp saved = otpRepository.save(record);
        return new GeneratedOtp(saved != null ? saved : record, codeStr);
    }

    /**
     * Validates submitted OTP for any purpose (backward compatible signature).
     */
    @Transactional
    public boolean verifyOtp(String email, String codeStr) {
        return verifyOtpInternal(email, codeStr, null);
    }

    /**
     * Validates submitted OTP strictly scoped to an intended purpose.
     */
    @Transactional
    public boolean verifyOtpForPurpose(String email, String codeStr, String expectedPurpose) {
        return verifyOtpInternal(email, codeStr, expectedPurpose);
    }

    private boolean verifyOtpInternal(String email, String codeStr, String expectedPurpose) {
        if (email == null || codeStr == null) {
            return false;
        }
        String cleanCode = codeStr.trim();
        if (!cleanCode.matches("^\\d{6}$")) {
            return false;
        }
        String cleanEmail = email.trim().toLowerCase();

        Optional<EmailVerificationOtp> latestOpt = expectedPurpose != null
                ? otpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(cleanEmail, expectedPurpose)
                : otpRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);

        if (latestOpt.isEmpty() && expectedPurpose != null) {
            Optional<EmailVerificationOtp> legacyOpt = otpRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);
            if (legacyOpt.isPresent() && legacyOpt.get().getPurpose() == null) {
                latestOpt = legacyOpt;
            }
        }

        if (latestOpt.isEmpty()) {
            return false;
        }

        EmailVerificationOtp record = latestOpt.get();
        if (record.getOtpHash() == null || record.getExpiresAt() == null) {
            return false;
        }

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            logger.warn("Expired OTP submitted for {}", SecuritySanitizer.maskEmail(cleanEmail));
            return false;
        }

        if (record.isVerified()) {
            return false;
        }

        if (record.getAttempts() >= MAX_ATTEMPTS) {
            logger.warn("Max OTP attempts exceeded for {}", SecuritySanitizer.maskEmail(cleanEmail));
            return false;
        }

        record.setAttempts(record.getAttempts() + 1);

        if (passwordEncoder.matches(cleanCode, record.getOtpHash())) {
            record.setVerified(true);
            otpRepository.save(record);
            return true;
        }

        otpRepository.save(record);
        return false;
    }
}
