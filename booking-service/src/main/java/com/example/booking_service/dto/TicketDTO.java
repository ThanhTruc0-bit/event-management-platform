package com.example.booking_service.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketDTO {

    private Long id;

    private Long bookingId;

    private Long userId;

    private Long eventId;

    private Long seatId;

    private String ticketCode;

    private String ticketType;

    private Double price;

    private String status;

    private LocalDateTime issuedAt;

    private LocalDateTime usedAt;

    private String qrContent;

    private String qrImage;
}