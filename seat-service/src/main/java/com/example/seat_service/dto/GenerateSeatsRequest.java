package com.example.seat_service.dto;

import lombok.Data;

@Data
public class GenerateSeatsRequest {

    private Long eventId;

    // Ví dụ: A, B, VIP, STANDARD
    private String prefix;

    // Ví dụ: 1
    private Integer startNumber;

    // Ví dụ: 30
    private Integer endNumber;

    // VIP, STANDARD, STANDING
    private String seatType;

    // AVAILABLE, RESERVED, BOOKED
    private String status;

    private Double price;
}