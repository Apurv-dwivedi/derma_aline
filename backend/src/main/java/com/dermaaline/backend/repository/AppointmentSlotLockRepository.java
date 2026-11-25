package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.AppointmentSlotLock;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppointmentSlotLockRepository extends JpaRepository<AppointmentSlotLock, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000")})
    @Query("SELECT s FROM AppointmentSlotLock s WHERE s.slotKey = :slotKey")
    Optional<AppointmentSlotLock> findLockedBySlotKey(@Param("slotKey") String slotKey);
}
