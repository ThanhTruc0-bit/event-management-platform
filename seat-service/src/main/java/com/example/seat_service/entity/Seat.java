package com.example.seat_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "seats")
@Data
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Sự kiện mà ghế thuộc về
    private Long eventId;

    // Ví dụ: A1, A2, B1,...
    private String seatNumber;

    // VIP, STANDARD, STANDING
    private String seatType;

    // AVAILABLE, RESERVED, BOOKED
    private String status;
    //
    private Double price;

}