package com.example.notification_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingCreatedEvent {

    private String messageId;

    private Long bookingId;

    private Long userId;

    private String bookingCode;

    private Double totalAmount;

    private String message;

    private LocalDateTime occurredAt;
}