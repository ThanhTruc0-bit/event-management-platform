package com.example.booking_service.specification;

import com.example.booking_service.entity.Booking;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class BookingSpecification {

    private BookingSpecification() {
    }

    public static Specification<Booking> filter(
            String keyword,
            String status,
            Long userId,
            Long eventId,
            Double minAmount,
            Double maxAmount,
            LocalDateTime fromDate,
            LocalDateTime toDate) {
        return Specification
                .where(keywordContains(keyword))
                .and(statusEquals(status))
                .and(userIdEquals(userId))
                .and(eventIdEquals(eventId))
                .and(amountGreaterThanOrEqual(minAmount))
                .and(amountLessThanOrEqual(maxAmount))
                .and(dateGreaterThanOrEqual(fromDate))
                .and(dateLessThanOrEqual(toDate));
    }

    private static Specification<Booking> keywordContains(String keyword) {
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
                                    root.get("bookingCode")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("status")),
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
                            root.get("eventId")
                                    .as(String.class),
                            value));
        };
    }

    private static Specification<Booking> statusEquals(String status) {
        return (root, query, builder) -> {
            if (status == null
                    || status.isBlank()
                    || "ALL".equalsIgnoreCase(status)) {
                return builder.conjunction();
            }

            return builder.equal(
                    builder.upper(
                            root.get("status")),
                    status
                            .trim()
                            .toUpperCase());
        };
    }

    private static Specification<Booking> userIdEquals(Long userId) {
        return (root, query, builder) -> userId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("userId"),
                        userId);
    }

    private static Specification<Booking> eventIdEquals(Long eventId) {
        return (root, query, builder) -> eventId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("eventId"),
                        eventId);
    }

    private static Specification<Booking> amountGreaterThanOrEqual(
            Double minAmount) {
        return (root, query, builder) -> minAmount == null
                ? builder.conjunction()
                : builder.greaterThanOrEqualTo(
                        root.get("totalAmount"),
                        minAmount);
    }

    private static Specification<Booking> amountLessThanOrEqual(
            Double maxAmount) {
        return (root, query, builder) -> maxAmount == null
                ? builder.conjunction()
                : builder.lessThanOrEqualTo(
                        root.get("totalAmount"),
                        maxAmount);
    }

    private static Specification<Booking> dateGreaterThanOrEqual(
            LocalDateTime fromDate) {
        return (root, query, builder) -> fromDate == null
                ? builder.conjunction()
                : builder.greaterThanOrEqualTo(
                        root.get("bookingDate"),
                        fromDate);
    }

    private static Specification<Booking> dateLessThanOrEqual(
            LocalDateTime toDate) {
        return (root, query, builder) -> toDate == null
                ? builder.conjunction()
                : builder.lessThanOrEqualTo(
                        root.get("bookingDate"),
                        toDate);
    }
}