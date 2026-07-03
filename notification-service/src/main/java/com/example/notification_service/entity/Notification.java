package com.example.notification_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private Long bookingId;

    private String title;

    @Column(length = 2000)
    private String message;

    private String type;

    private Boolean isRead;

    private LocalDateTime readAt;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (isRead == null) {
            isRead = false;
        }

        if (type == null || type.isBlank()) {
            type = "SYSTEM";
        }
    }
}