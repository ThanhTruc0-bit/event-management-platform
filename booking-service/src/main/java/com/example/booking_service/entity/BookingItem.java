package com.example.booking_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "booking_items", indexes = {
        @Index(name = "idx_booking_item_booking_id", columnList = "booking_id"),
        @Index(name = "idx_booking_item_seat_id", columnList = "seat_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_item_booking_seat", columnNames = {
                "booking_id",
                "seat_id"
        })
})
@Data
public class BookingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    @Column(name = "seat_id", nullable = false)
    private Long seatId;

    @Column(nullable = false)
    private Double price;
}