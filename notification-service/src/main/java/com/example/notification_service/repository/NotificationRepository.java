package com.example.notification_service.repository;

import com.example.notification_service.entity.Notification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long>,
        JpaSpecificationExecutor<Notification> {

    Optional<Notification> findByEventKey(
            String eventKey);

    boolean existsByEventKey(
            String eventKey);

    long countByUserIdAndIsReadFalse(
            Long userId);

    @Modifying
    @Query("""
            UPDATE Notification notification
            SET notification.isRead = true,
                notification.readAt = :readAt,
                notification.updatedAt = :readAt
            WHERE notification.userId = :userId
              AND notification.isRead = false
            """)
    int markAllAsReadByUserId(
            @Param("userId") Long userId,

            @Param("readAt") LocalDateTime readAt);
}