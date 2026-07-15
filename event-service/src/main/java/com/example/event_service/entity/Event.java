package com.example.event_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "events", indexes = {
        @Index(name = "idx_event_name", columnList = "name"),
        @Index(name = "idx_event_category", columnList = "category_id"),
        @Index(name = "idx_event_status", columnList = "status"),
        @Index(name = "idx_event_date", columnList = "event_date"),
        @Index(name = "idx_event_featured", columnList = "featured"),
        @Index(name = "idx_event_sale_start", columnList = "sale_start_at"),
        @Index(name = "idx_event_sale_end", columnList = "sale_end_at")
})
@Data
public class Event implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 5000)
    private String description;

    @Column(length = 500)
    private String location;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(name = "sale_start_at")
    private LocalDateTime saleStartAt;

    @Column(name = "sale_end_at")
    private LocalDateTime saleEndAt;

    @Column(length = 1000)
    private String banner;

    @Column(nullable = false)
    private Boolean featured = false;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT";

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
            status = "DRAFT";
        }

        status = status
                .trim()
                .toUpperCase();

        if (featured == null) {
            featured = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        if (status != null) {
            status = status
                    .trim()
                    .toUpperCase();
        }

        if (featured == null) {
            featured = false;
        }
    }
}