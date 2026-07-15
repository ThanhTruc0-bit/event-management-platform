package com.example.event_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_categories", indexes = {
        @Index(name = "idx_event_category_name", columnList = "name"),
        @Index(name = "idx_event_category_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_event_category_name", columnNames = "name"),
        @UniqueConstraint(name = "uk_event_category_slug", columnNames = "slug")
})
@Data
public class EventCategory
        implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 180)
    private String slug;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (status == null
                || status.isBlank()) {
            status = "ACTIVE";
        }

        status = status
                .trim()
                .toUpperCase();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        if (status != null) {
            status = status
                    .trim()
                    .toUpperCase();
        }
    }
}