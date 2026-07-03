package com.example.booking_service.dto;

import lombok.Data;

@Data
public class PaymentDTO {

    private Long id;
    private Long bookingId;
    private Double amount;
    private String paymentMethod;
    private String status;

}