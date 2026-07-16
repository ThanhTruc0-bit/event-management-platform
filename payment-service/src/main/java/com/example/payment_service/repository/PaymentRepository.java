package com.example.payment_service.repository;

import com.example.payment_service.entity.Payment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<Payment, Long>,
        JpaSpecificationExecutor<Payment> {

    List<Payment> findByBookingIdOrderByCreatedAtDesc(
            Long bookingId);

    List<Payment> findByBookingIdAndStatusIgnoreCase(
            Long bookingId,
            String status);

    Optional<Payment> findByTransactionCode(
            String transactionCode);

    boolean existsByBookingIdAndStatusIgnoreCase(
            Long bookingId,
            String status);

    @Query("""
            SELECT p
              FROM Payment p
             WHERE UPPER(p.status) = 'SUCCESS'
               AND (
                    p.syncStatus IS NULL
                    OR UPPER(p.syncStatus) IN ('PENDING', 'RETRY')
               )
               AND (
                    p.nextSyncAt IS NULL
                    OR p.nextSyncAt <= :now
               )
             ORDER BY p.createdAt ASC
            """)
    List<Payment> findPaymentsNeedingSynchronization(
            @Param("now") LocalDateTime now,
            Pageable pageable);
}