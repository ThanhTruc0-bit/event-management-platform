package com.example.notification_service.event;

import com.example.notification_service.config.RabbitMQConfig;
import com.example.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventConsumer {

    private final NotificationService notificationService;

    @RabbitListener(
            queues = RabbitMQConfig.BOOKING_CREATED_QUEUE
    )
    public void handleBookingCreated(
            BookingCreatedEvent event
    ) {
        log.info(
                "Received booking.created event: bookingId={}",
                event.getBookingId()
        );

        notificationService.createFromBookingCreated(event);
    }

    @RabbitListener(
            queues = RabbitMQConfig.BOOKING_CANCELLED_QUEUE
    )
    public void handleBookingCancelled(
            BookingCancelledEvent event
    ) {
        log.info(
                "Received booking.cancelled event: bookingId={}",
                event.getBookingId()
        );

        notificationService.createFromBookingCancelled(event);
    }

    @RabbitListener(
            queues = RabbitMQConfig.PAYMENT_SUCCESS_QUEUE
    )
    public void handlePaymentSuccess(
            PaymentStatusEvent event
    ) {
        log.info(
                "Received payment.success event: paymentId={}, bookingId={}",
                event.getPaymentId(),
                event.getBookingId()
        );

        notificationService.createFromPaymentSuccess(event);
    }

    @RabbitListener(
            queues = RabbitMQConfig.PAYMENT_FAILED_QUEUE
    )
    public void handlePaymentFailed(
            PaymentStatusEvent event
    ) {
        log.info(
                "Received payment.failed event: paymentId={}, bookingId={}",
                event.getPaymentId(),
                event.getBookingId()
        );

        notificationService.createFromPaymentFailed(event);
    }

    @RabbitListener(
            queues = RabbitMQConfig.TICKET_ISSUED_QUEUE
    )
    public void handleTicketIssued(
            TicketIssuedEvent event
    ) {
        log.info(
                "Received ticket.issued event: ticketId={}, bookingId={}",
                event.getTicketId(),
                event.getBookingId()
        );

        notificationService.createFromTicketIssued(event);
    }
}