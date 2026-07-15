package com.example.notification_service.controller;

import com.example.notification_service.dto.NotificationCreateRequest;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /*
     * ADMIN xem toàn bộ thông báo.
     */
    @GetMapping
    public Page<Notification> searchAllNotifications(
            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long userId,

            @RequestParam(required = false) Long bookingId,

            @RequestParam(required = false) String type,

            @RequestParam(required = false) Boolean isRead,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,

            @RequestParam(defaultValue = "createdAt") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .searchAllNotifications(
                        page,
                        size,
                        keyword,
                        userId,
                        bookingId,
                        type,
                        isRead,
                        fromDate,
                        toDate,
                        sortBy,
                        sortDirection,
                        role);
    }

    @GetMapping("/{id}")
    public Notification getNotificationById(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .getNotificationById(
                        id,
                        currentUserId,
                        role);
    }

    @GetMapping("/user/{userId}")
    public Page<Notification> searchNotificationsByUser(
            @PathVariable Long userId,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) String type,

            @RequestParam(required = false) Boolean isRead,

            @RequestParam(defaultValue = "createdAt") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .searchNotificationsByUser(
                        userId,
                        page,
                        size,
                        keyword,
                        type,
                        isRead,
                        sortBy,
                        sortDirection,
                        currentUserId,
                        role);
    }

    @GetMapping("/booking/{bookingId}")
    public Page<Notification> searchNotificationsByBooking(
            @PathVariable Long bookingId,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) String type,

            @RequestParam(required = false) Boolean isRead,

            @RequestParam(defaultValue = "createdAt") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .searchNotificationsByBooking(
                        bookingId,
                        page,
                        size,
                        keyword,
                        type,
                        isRead,
                        sortBy,
                        sortDirection,
                        currentUserId,
                        role);
    }

    @GetMapping("/user/{userId}/unread-count")
    public Map<String, Long> getUnreadCount(
            @PathVariable Long userId,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        long count = notificationService
                .getUnreadCount(
                        userId,
                        currentUserId,
                        role);

        return Map.of(
                "unreadCount",
                count);
    }

    /*
     * Chỉ ADMIN tạo thông báo thủ công.
     * Các thông báo nghiệp vụ phải đi qua RabbitMQ.
     */
    @PostMapping
    public Notification createManualNotification(
            @RequestBody NotificationCreateRequest request,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .createManualNotification(
                        request,
                        role);
    }

    @PutMapping("/{id}/read")
    public Notification markAsRead(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .markAsRead(
                        id,
                        currentUserId,
                        role);
    }

    @PutMapping("/{id}/unread")
    public Notification markAsUnread(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return notificationService
                .markAsUnread(
                        id,
                        currentUserId,
                        role);
    }

    @PutMapping("/user/{userId}/read-all")
    public Map<String, Integer> markAllAsRead(
            @PathVariable Long userId,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        int updated = notificationService
                .markAllAsRead(
                        userId,
                        currentUserId,
                        role);

        return Map.of(
                "updated",
                updated);
    }

    @DeleteMapping("/{id}")
    public void deleteNotification(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        notificationService
                .deleteNotification(
                        id,
                        currentUserId,
                        role);
    }
}