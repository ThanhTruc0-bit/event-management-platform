package com.example.notification_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingCancelledEvent {

    private String messageId;

    private Long bookingId;

    private Long userId;

    private String bookingCode;

    private String reason;

    private LocalDateTime occurredAt;
}