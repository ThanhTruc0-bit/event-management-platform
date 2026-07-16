package com.example.payment_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
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

    /*
     * NOT_REQUIRED: payment chưa SUCCESS nên chưa cần đồng bộ.
     * PENDING: đang chờ đồng bộ lần đầu.
     * RETRY: lần trước lỗi, scheduler sẽ tự thử lại.
     * SYNCED: booking đã PAID, ghế và vé đã đồng bộ.
     * FAILED: đã thử quá số lần cấu hình.
     */
    @Column(length = 30)
    private String syncStatus;

    private Integer syncAttempts;

    private LocalDateTime nextSyncAt;

    @Column(length = 3000)
    private String lastSyncError;

    private LocalDateTime syncedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        createdAt = now;
        updatedAt = now;

        normalizeFields();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        normalizeFields();
    }

    private void normalizeFields() {
        if (status == null || status.isBlank()) {
            status = "PENDING";
        } else {
            status = status.trim().toUpperCase();
        }

        if (paymentMethod == null || paymentMethod.isBlank()) {
            paymentMethod = "VNPAY";
        } else {
            paymentMethod = paymentMethod.trim().toUpperCase();
        }

        if (syncAttempts == null || syncAttempts < 0) {
            syncAttempts = 0;
        }

        if (syncStatus == null || syncStatus.isBlank()) {
            syncStatus = "SUCCESS".equals(status)
                    ? "PENDING"
                    : "NOT_REQUIRED";
        } else {
            syncStatus = syncStatus.trim().toUpperCase();
        }
    }
}