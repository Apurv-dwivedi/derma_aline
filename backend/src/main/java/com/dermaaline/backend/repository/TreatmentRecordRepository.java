package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.TreatmentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TreatmentRecordRepository extends JpaRepository<TreatmentRecord, Long> {
    List<TreatmentRecord> findByCustomerIdOrderByTreatmentDateDesc(Long customerId);
    List<TreatmentRecord> findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(String customerEmail);
    List<TreatmentRecord> findAllByOrderByTreatmentDateDesc();
    long count();
}
