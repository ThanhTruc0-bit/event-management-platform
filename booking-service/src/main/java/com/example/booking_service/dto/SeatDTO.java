package com.example.booking_service.dto;

import lombok.Data;

@Data
public class SeatDTO {

    private Long id;
    private Long eventId;
    private String seatNumber;
    private String seatType;
    private String status;
    private Double price;
}