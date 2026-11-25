package com.dermaaline.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointment_slot_locks")
public class AppointmentSlotLock {

    @Id
    @Column(name = "slot_key", length = 64, nullable = false)
    private String slotKey;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public AppointmentSlotLock() {
    }

    public AppointmentSlotLock(String slotKey) {
        this.slotKey = slotKey;
        this.createdAt = LocalDateTime.now();
    }

    public String getSlotKey() {
        return slotKey;
    }

    public void setSlotKey(String slotKey) {
        this.slotKey = slotKey;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
