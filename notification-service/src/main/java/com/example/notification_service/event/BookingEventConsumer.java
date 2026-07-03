package com.example.notification_service.event;

import com.example.notification_service.config.RabbitMQConfig;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class BookingEventConsumer {

    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void handleBookingCreatedEvent(BookingCreatedEvent event) {
        Notification notification = new Notification();

        notification.setUserId(event.getUserId());
        notification.setBookingId(event.getBookingId());
        notification.setTitle("Booking Created");
        notification.setMessage(
                event.getMessage() != null && !event.getMessage().isBlank()
                        ? event.getMessage()
                        : "Booking created: " + event.getBookingCode()
        );
        notification.setType("BOOKING_CREATED");
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);

        System.out.println("Received RabbitMQ booking event: " + event.getBookingCode());
    }
}