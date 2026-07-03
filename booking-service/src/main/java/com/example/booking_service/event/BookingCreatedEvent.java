package com.example.booking_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingCreatedEvent {

    private Long bookingId;
    private Long userId;
    private String bookingCode;
    private Double totalAmount;
    private String message;
}