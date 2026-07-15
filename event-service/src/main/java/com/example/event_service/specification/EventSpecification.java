package com.example.event_service.specification;

import com.example.event_service.entity.Event;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class EventSpecification {

    private EventSpecification() {
    }

    public static Specification<Event> filter(
            String keyword,
            Set<Long> keywordCategoryIds,
            Long categoryId,
            String status,
            Boolean featured,
            String location,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            boolean publicOnly) {
        return Specification
                .where(
                        keywordContains(
                                keyword,
                                keywordCategoryIds))
                .and(
                        categoryIdEquals(
                                categoryId))
                .and(
                        statusEquals(
                                status))
                .and(
                        featuredEquals(
                                featured))
                .and(
                        locationContains(
                                location))
                .and(
                        eventDateFrom(
                                fromDate))
                .and(
                        eventDateTo(
                                toDate))
                .and(
                        publicVisibility(
                                publicOnly));
    }

    private static Specification<Event> keywordContains(
            String keyword,
            Set<Long> categoryIds) {
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

            List<Predicate> predicates = new ArrayList<>();

            predicates.add(
                    builder.like(
                            builder.lower(
                                    root.get("name")),
                            value));

            predicates.add(
                    builder.like(
                            builder.lower(
                                    root.get("description")),
                            value));

            predicates.add(
                    builder.like(
                            builder.lower(
                                    root.get("location")),
                            value));

            predicates.add(
                    builder.like(
                            builder.lower(
                                    root.get("status")),
                            value));

            if (categoryIds != null
                    && !categoryIds.isEmpty()) {
                predicates.add(
                        root
                                .get("categoryId")
                                .in(categoryIds));
            }

            return builder.or(
                    predicates.toArray(
                            new Predicate[0]));
        };
    }

    private static Specification<Event> categoryIdEquals(
            Long categoryId) {
        return (root, query, builder) -> categoryId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("categoryId"),
                        categoryId);
    }

    private static Specification<Event> statusEquals(
            String status) {
        return (root, query, builder) -> {
            if (status == null
                    || status.isBlank()
                    || "ALL".equalsIgnoreCase(
                            status)) {
                return builder.conjunction();
            }

            String normalized = normalizeLegacyStatus(
                    status);

            return builder.equal(
                    builder.upper(
                            root.get("status")),
                    normalized);
        };
    }

    private static Specification<Event> featuredEquals(
            Boolean featured) {
        return (root, query, builder) -> featured == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("featured"),
                        featured);
    }

    private static Specification<Event> locationContains(
            String location) {
        return (root, query, builder) -> {
            if (location == null
                    || location.isBlank()) {
                return builder.conjunction();
            }

            return builder.like(
                    builder.lower(
                            root.get("location")),
                    "%"
                            + location
                                    .trim()
                                    .toLowerCase()
                            + "%");
        };
    }

    private static Specification<Event> eventDateFrom(
            LocalDateTime fromDate) {
        return (root, query, builder) -> fromDate == null
                ? builder.conjunction()
                : builder
                        .greaterThanOrEqualTo(
                                root.get("eventDate"),
                                fromDate);
    }

    private static Specification<Event> eventDateTo(
            LocalDateTime toDate) {
        return (root, query, builder) -> toDate == null
                ? builder.conjunction()
                : builder
                        .lessThanOrEqualTo(
                                root.get("eventDate"),
                                toDate);
    }

    private static Specification<Event> publicVisibility(
            boolean publicOnly) {
        return (root, query, builder) -> {
            if (!publicOnly) {
                return builder.conjunction();
            }

            return builder.not(
                    builder.upper(
                            root.get("status")).in(
                                    "DRAFT",
                                    "CANCELLED"));
        };
    }

    private static String normalizeLegacyStatus(
            String status) {
        String value = status
                .trim()
                .toUpperCase();

        if ("ACTIVE".equals(value)) {
            return "OPEN";
        }

        if ("ENDED".equals(value)) {
            return "COMPLETED";
        }

        return value;
    }
}