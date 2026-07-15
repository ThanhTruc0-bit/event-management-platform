package com.example.event_service.specification;

import com.example.event_service.entity.EventCategory;
import org.springframework.data.jpa.domain.Specification;

public final class EventCategorySpecification {

    private EventCategorySpecification() {
    }

    public static Specification<EventCategory> filter(
            String keyword,
            String status) {
        return Specification
                .where(
                        keywordContains(
                                keyword))
                .and(
                        statusEquals(
                                status));
    }

    private static Specification<EventCategory> keywordContains(
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
                                    root.get("name")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("slug")),
                            value),
                    builder.like(
                            builder.lower(
                                    root.get("description")),
                            value));
        };
    }

    private static Specification<EventCategory> statusEquals(
            String status) {
        return (root, query, builder) -> {
            if (status == null
                    || status.isBlank()
                    || "ALL".equalsIgnoreCase(
                            status)) {
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
}