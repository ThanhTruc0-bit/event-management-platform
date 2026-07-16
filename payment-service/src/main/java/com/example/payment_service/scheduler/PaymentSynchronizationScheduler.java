package com.example.payment_service.scheduler;

import com.example.payment_service.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentSynchronizationScheduler {

    private static final Logger log = LoggerFactory.getLogger(
            PaymentSynchronizationScheduler.class);

    private final PaymentService paymentService;

    @Scheduled(initialDelayString = "${payment.sync.initial-delay:5000}", fixedDelayString = "${payment.sync.fixed-delay:10000}")
    public void synchronizeSuccessfulPayments() {
        try {
            int synchronizedCount = paymentService
                    .synchronizePendingPayments();

            if (synchronizedCount > 0) {
                log.info(
                        "Automatically synchronized {} successful payment(s)",
                        synchronizedCount);
            }
        } catch (Exception exception) {
            log.error(
                    "Automatic payment synchronization scheduler failed: {}",
                    exception.getMessage(),
                    exception);
        }
    }
}