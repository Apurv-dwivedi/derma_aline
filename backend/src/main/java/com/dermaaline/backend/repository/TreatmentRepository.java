package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.Treatment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TreatmentRepository extends JpaRepository<Treatment, Long> {
    List<Treatment> findByActiveTrue();
    Optional<Treatment> findByNameIgnoreCase(String name);
}