package com.example.booking_service.dto;

import lombok.Data;

import java.util.List;

@Data
public class BookingRequest {

    private Long userId;
    private Long eventId;
    private List<Long> seatIds;
}