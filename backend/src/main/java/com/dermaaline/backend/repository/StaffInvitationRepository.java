package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.StaffInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StaffInvitationRepository extends JpaRepository<StaffInvitation, Long> {
    Optional<StaffInvitation> findByEmail(String email);
    Optional<StaffInvitation> findByToken(String token);
}