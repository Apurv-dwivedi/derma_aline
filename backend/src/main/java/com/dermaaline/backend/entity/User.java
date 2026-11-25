package com.dermaaline.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private Role role = Role.CUSTOMER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AccountStatus status = AccountStatus.ACTIVE;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "profile_picture", columnDefinition = "TEXT")
    private String profilePicture;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "token_version", nullable = false)
    private Long tokenVersion = 0L;

    public enum Role {
        SUPER_ADMIN, ADMIN, STAFF, CUSTOMER, PATIENT
    }

    public enum AccountStatus {
        PENDING_VERIFICATION, ACTIVE, DISABLED
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Role getRole() { return role != null ? role : Role.CUSTOMER; }
    public void setRole(Role role) { this.role = role != null ? role : Role.CUSTOMER; }

    public AccountStatus getStatus() { return status != null ? status : AccountStatus.ACTIVE; }
    public void setStatus(AccountStatus status) { this.status = status != null ? status : AccountStatus.ACTIVE; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public String getProfilePicture() { return profilePicture; }
    public void setProfilePicture(String profilePicture) { this.profilePicture = profilePicture; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public LocalDateTime getResetTokenExpiry() { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime resetTokenExpiry) { this.resetTokenExpiry = resetTokenExpiry; }

    public Long getTokenVersion() { return tokenVersion != null ? tokenVersion : 0L; }
    public void setTokenVersion(Long tokenVersion) { this.tokenVersion = tokenVersion != null ? tokenVersion : 0L; }
    public void incrementTokenVersion() { this.tokenVersion = getTokenVersion() + 1L; }
}
