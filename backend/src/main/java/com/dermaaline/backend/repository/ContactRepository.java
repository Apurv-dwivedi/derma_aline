package com.dermaaline.backend.repository;

import com.dermaaline.backend.entity.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactRepository extends JpaRepository<ContactMessage, Long> {
    List<ContactMessage> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
    List<ContactMessage> findAllByOrderByCreatedAtDesc();
}
