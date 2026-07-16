package com.example.seat_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_seats_event_seat_number", columnNames = {
                "event_id",
                "seat_number"
        })
}, indexes = {
        @Index(name = "idx_seats_event_id", columnList = "event_id"),
        @Index(name = "idx_seats_status", columnList = "status"),
        @Index(name = "idx_seats_type", columnList = "seat_type")
})
@Data
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "seat_number", nullable = false, length = 100)
    private String seatNumber;

    @Column(name = "seat_type", nullable = false, length = 50)
    private String seatType;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "price", nullable = false)
    private Double price;

    @PrePersist
    public void prePersist() {
        normalizeFields();
    }

    @PreUpdate
    public void preUpdate() {
        normalizeFields();
    }

    private void normalizeFields() {
        if (seatNumber != null) {
            seatNumber = seatNumber
                    .trim()
                    .toUpperCase();
        }

        if (seatType == null ||
                seatType.isBlank()) {
            seatType = "STANDARD";
        } else {
            seatType = seatType
                    .trim()
                    .toUpperCase();
        }

        if (status == null ||
                status.isBlank()) {
            status = "AVAILABLE";
        } else {
            status = status
                    .trim()
                    .toUpperCase();
        }

        if (price == null) {
            price = 0D;
        }
    }
}