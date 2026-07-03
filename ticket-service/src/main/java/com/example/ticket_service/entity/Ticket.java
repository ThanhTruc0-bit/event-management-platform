package com.example.ticket_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "tickets",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "ticketCode"),
                @UniqueConstraint(columnNames = {"bookingId", "seatId"})
        }
)
@Data
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;

    private Long userId;

    private Long eventId;

    private Long seatId;

    private String ticketCode;

    private String ticketType;

    private Double price;

    private String status;

    private LocalDateTime issuedAt;

    private LocalDateTime usedAt;

    @Column(length = 2000)
    private String qrContent;

    @Column(columnDefinition = "LONGTEXT")
    private String qrImage;

    @PrePersist
    public void prePersist() {
        if (status == null || status.isBlank()) {
            status = "VALID";
        }

        if (issuedAt == null) {
            issuedAt = LocalDateTime.now();
        }
    }
}