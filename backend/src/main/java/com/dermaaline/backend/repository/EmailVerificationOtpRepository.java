package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.EmailVerificationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    Optional<EmailVerificationOtp> findTopByEmailOrderByCreatedAtDesc(String email);
    Optional<EmailVerificationOtp> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);
    void deleteByEmail(String email);
}
