package com.example.notification_service.specification;

import com.example.notification_service.entity.Notification;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class NotificationSpecification {

    private NotificationSpecification() {
    }

    public static Specification<Notification> filter(
            String keyword,
            Long userId,
            Long bookingId,
            String type,
            Boolean isRead,
            LocalDateTime fromDate,
            LocalDateTime toDate) {
        return Specification
                .where(keywordContains(keyword))
                .and(userIdEquals(userId))
                .and(bookingIdEquals(bookingId))
                .and(typeEquals(type))
                .and(isReadEquals(isRead))
                .and(createdAtFrom(fromDate))
                .and(createdAtTo(toDate));
    }

    private static Specification<Notification> keywordContains(
            String keyword) {
        return (root, query, builder) -> {
            if (keyword == null
                    || keyword.isBlank()) {
                return builder.conjunction();
            }

            String value = "%"
                    + keyword
                            .trim()
                            .toLowerCase()
                    + "%";

            return builder.or(
                    builder.like(
                            builder.lower(
                                    root.get("title")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("message")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("type")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("eventKey")),
                            value),
                    builder.like(
                            root.get("id")
                                    .as(String.class),
                            value),
                    builder.like(
                            root.get("userId")
                                    .as(String.class),
                            value),
                    builder.like(
                            root.get("bookingId")
                                    .as(String.class),
                            value));
        };
    }

    private static Specification<Notification> userIdEquals(
            Long userId) {
        return (root, query, builder) -> userId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("userId"),
                        userId);
    }

    private static Specification<Notification> bookingIdEquals(
            Long bookingId) {
        return (root, query, builder) -> bookingId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("bookingId"),
                        bookingId);
    }

    private static Specification<Notification> typeEquals(
            String type) {
        return (root, query, builder) -> {
            if (type == null
                    || type.isBlank()
                    || "ALL".equalsIgnoreCase(type)) {
                return builder.conjunction();
            }

            return builder.equal(
                    builder.upper(
                            root.get("type")),
                    type
                            .trim()
                            .toUpperCase());
        };
    }

    private static Specification<Notification> isReadEquals(
            Boolean isRead) {
        return (root, query, builder) -> isRead == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("isRead"),
                        isRead);
    }

    private static Specification<Notification> createdAtFrom(
            LocalDateTime fromDate) {
        return (root, query, builder) -> fromDate == null
                ? builder.conjunction()
                : builder.greaterThanOrEqualTo(
                        root.get("createdAt"),
                        fromDate);
    }

    private static Specification<Notification> createdAtTo(
            LocalDateTime toDate) {
        return (root, query, builder) -> toDate == null
                ? builder.conjunction()
                : builder.lessThanOrEqualTo(
                        root.get("createdAt"),
                        toDate);
    }
}