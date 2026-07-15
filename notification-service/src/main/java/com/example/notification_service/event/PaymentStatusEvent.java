package com.example.notification_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentStatusEvent {

    private String messageId;

    private Long paymentId;

    private Long bookingId;

    private Long userId;

    private Double amount;

    private String paymentMethod;

    private String transactionCode;

    private String message;

    private LocalDateTime occurredAt;
}