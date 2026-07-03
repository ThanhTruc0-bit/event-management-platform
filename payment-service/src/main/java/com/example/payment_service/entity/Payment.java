package com.example.payment_service.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;

    private Double amount;

    // VNPAY, DEMO_QR, CASH
    private String paymentMethod;

    // PENDING, SUCCESS, FAILED
    private String status;

    private String transactionCode;

    private String vnpTransactionNo;

    private String vnpResponseCode;

    private String vnpBankCode;

    @Column(length = 3000)
    private String paymentUrl;

    @Column(length = 3000)
    private String qrContent;

    private LocalDateTime paymentDate;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null || status.isBlank()) {
            status = "PENDING";
        }

        if (paymentMethod == null || paymentMethod.isBlank()) {
            paymentMethod = "VNPAY";
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}