package com.example.ticket_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "tickets",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ticket_code",
                        columnNames = "ticket_code"
                ),
                @UniqueConstraint(
                        name = "uk_ticket_booking_seat",
                        columnNames = {
                                "booking_id",
                                "seat_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_ticket_user",
                        columnList = "user_id"
                ),
                @Index(
                        name = "idx_ticket_event",
                        columnList = "event_id"
                ),
                @Index(
                        name = "idx_ticket_booking",
                        columnList = "booking_id"
                ),
                @Index(
                        name = "idx_ticket_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_ticket_issued_at",
                        columnList = "issued_at"
                )
        }
)
@Data
public class Ticket {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    @Column(
            name = "booking_id",
            nullable = false
    )
    private Long bookingId;

    @Column(
            name = "user_id",
            nullable = false
    )
    private Long userId;

    @Column(
            name = "event_id",
            nullable = false
    )
    private Long eventId;

    @Column(
            name = "seat_id",
            nullable = false
    )
    private Long seatId;

    @Column(
            name = "ticket_code",
            nullable = false,
            unique = true,
            length = 100
    )
    private String ticketCode;

    @Column(
            name = "ticket_type",
            nullable = false,
            length = 50
    )
    private String ticketType;

    @Column(
            name = "price",
            nullable = false
    )
    private Double price;

    @Column(
            name = "status",
            nullable = false,
            length = 30
    )
    private String status;

    @Column(
            name = "issued_at",
            nullable = false
    )
    private LocalDateTime issuedAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(
            name = "qr_content",
            length = 2000
    )
    private String qrContent;

    @Lob
    @Column(
            name = "qr_image",
            columnDefinition = "LONGTEXT"
    )
    private String qrImage;

    /*
     * Chống hai request cập nhật cùng một vé
     * mà không phát hiện xung đột.
     */
    @Version
    @Column(name = "version")
    private Long version;

    @PrePersist
    public void prePersist() {
        normalizeFields();

        if (issuedAt == null) {
            issuedAt =
                    LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        normalizeFields();
    }

    private void normalizeFields() {
        if (ticketCode != null) {
            ticketCode =
                    ticketCode
                            .trim()
                            .toUpperCase();
        }

        if (
                ticketType == null ||
                ticketType.isBlank()
        ) {
            ticketType = "STANDARD";
        } else {
            ticketType =
                    ticketType
                            .trim()
                            .toUpperCase();
        }

        if (
                status == null ||
                status.isBlank()
        ) {
            status = "VALID";
        } else {
            status =
                    status
                            .trim()
                            .toUpperCase();
        }

        if (price == null) {
            price = 0D;
        }
    }
}