package com.example.booking_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "booking_items")
@Data
public class BookingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;

    private Long seatId;

    private Double price;
}