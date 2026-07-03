package com.example.notification_service.service;

import com.example.notification_service.entity.Notification;
import com.example.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    public Notification getNotificationById(Long id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Notification not found: " + id
                ));
    }

    public List<Notification> getNotificationsByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getNotificationsByBooking(Long bookingId) {
        return notificationRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
    }

    public List<Notification> getUnreadNotificationsByUser(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public Notification createNotification(Notification notification) {
        if (notification.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }

        if (notification.getTitle() == null || notification.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }

        if (notification.getMessage() == null || notification.getMessage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }

        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(LocalDateTime.now());
        }

        if (notification.getIsRead() == null) {
            notification.setIsRead(false);
        }

        if (notification.getType() == null || notification.getType().isBlank()) {
            notification.setType("SYSTEM");
        }

        return notificationRepository.save(notification);
    }

    public Notification updateNotification(Long id, Notification notification) {
        Notification oldNotification = getNotificationById(id);

        oldNotification.setUserId(notification.getUserId());
        oldNotification.setBookingId(notification.getBookingId());
        oldNotification.setTitle(notification.getTitle());
        oldNotification.setMessage(notification.getMessage());
        oldNotification.setType(notification.getType());

        if (notification.getIsRead() != null) {
            oldNotification.setIsRead(notification.getIsRead());

            if (notification.getIsRead()) {
                oldNotification.setReadAt(LocalDateTime.now());
            } else {
                oldNotification.setReadAt(null);
            }
        }

        return notificationRepository.save(oldNotification);
    }

    public Notification markAsRead(Long id) {
        Notification notification = getNotificationById(id);

        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());

        return notificationRepository.save(notification);
    }

    public Notification markAsUnread(Long id) {
        Notification notification = getNotificationById(id);

        notification.setIsRead(false);
        notification.setReadAt(null);

        return notificationRepository.save(notification);
    }

    public void deleteNotification(Long id) {
        if (!notificationRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Notification not found: " + id
            );
        }

        notificationRepository.deleteById(id);
    }
}