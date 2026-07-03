package com.example.ticket_service.dto;

import lombok.Data;

@Data
public class TicketCreateRequest {

    private Long bookingId;

    private Long userId;

    private Long eventId;

    private Long seatId;

    private String ticketType;

    private Double price;
}