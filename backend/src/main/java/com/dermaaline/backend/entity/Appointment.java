package com.dermaaline.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_name", nullable = true)
    private String customerName;

    @Column(name = "patient_name", nullable = true)
    private String patientName;

    @Column(name = "customer_email", nullable = true)
    private String customerEmail;

    @Column(name = "email", nullable = true)
    private String email;

    @Column(name = "customer_phone", nullable = true)
    private String customerPhone;

    @Column(name = "phone", nullable = true)
    private String phone;

    @Column(name = "treatment_name", nullable = false)
    private String treatmentName;

    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    @Column(name = "appointment_time")
    private String appointmentTime;

    @Column(name = "notes")
    private String notes;

    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerName() { 
        return customerName != null ? customerName : patientName; 
    }
    public void setCustomerName(String customerName) { 
        this.customerName = customerName; 
        if (this.patientName == null) this.patientName = customerName;
    }

    public String getPatientName() { 
        return patientName != null ? patientName : customerName; 
    }
    public void setPatientName(String patientName) { 
        this.patientName = patientName; 
        if (this.customerName == null) this.customerName = patientName;
    }

    public String getCustomerEmail() { 
        return customerEmail != null ? customerEmail : email; 
    }
    public void setCustomerEmail(String customerEmail) { 
        this.customerEmail = customerEmail; 
        if (this.email == null) this.email = customerEmail;
    }

    public String getEmail() { 
        return email != null ? email : customerEmail; 
    }
    public void setEmail(String email) { 
        this.email = email; 
        if (this.customerEmail == null) this.customerEmail = email;
    }

    public String getCustomerPhone() { 
        return customerPhone != null ? customerPhone : phone; 
    }
    public void setCustomerPhone(String customerPhone) { 
        this.customerPhone = customerPhone; 
        if (this.phone == null) this.phone = customerPhone;
    }

    public String getPhone() { 
        return phone != null ? phone : customerPhone; 
    }
    public void setPhone(String phone) { 
        this.phone = phone; 
        if (this.customerPhone == null) this.customerPhone = phone;
    }

    public String getTreatmentName() { return treatmentName; }
    public void setTreatmentName(String treatmentName) { this.treatmentName = treatmentName; }

    public LocalDateTime getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDateTime appointmentDate) { this.appointmentDate = appointmentDate; }

    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
