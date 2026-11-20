package com.dermaaline.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clinic_settings")
public class ClinicSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String clinicName = "DERMA ALINE AESTHÉTICS SKIN CLINIC";

    private String contactEmail = "dermaalineaesthetics@gmail.com";
    private String contactPhone = "+91 93195 44704";
    private String address = "Derma Aline Aesthétics Clinic, Luxury Care Suite";
    private String openingHours = "Mon - Sat: 10:00 AM - 08:00 PM, Sun: By Consultation";

    @Column(columnDefinition = "TEXT")
    private String generalInformation = "Premier aesthetic skin clinic providing tailored clinical treatments, skin rejuvenation, and luxury dermatological care.";

    private LocalDateTime updatedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getClinicName() { return clinicName; }
    public void setClinicName(String clinicName) { this.clinicName = clinicName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getOpeningHours() { return openingHours; }
    public void setOpeningHours(String openingHours) { this.openingHours = openingHours; }

    public String getGeneralInformation() { return generalInformation; }
    public void setGeneralInformation(String generalInformation) { this.generalInformation = generalInformation; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
