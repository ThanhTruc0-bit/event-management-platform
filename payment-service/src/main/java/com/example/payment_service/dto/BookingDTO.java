package com.example.payment_service.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingDTO {

    private Long id;
    private Long userId;
    private Long eventId;
    private String bookingCode;
    private Double totalAmount;
    private String status;
    private LocalDateTime bookingDate;
}