package com.example.notification_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TicketIssuedEvent {

    private String messageId;

    private Long ticketId;

    private Long bookingId;

    private Long userId;

    private Long eventId;

    private Long seatId;

    private String ticketCode;

    private String ticketType;

    private LocalDateTime occurredAt;
}