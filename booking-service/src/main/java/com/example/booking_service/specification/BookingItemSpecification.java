package com.example.booking_service.specification;

import com.example.booking_service.entity.BookingItem;
import org.springframework.data.jpa.domain.Specification;

public final class BookingItemSpecification {

    private BookingItemSpecification() {
    }

    public static Specification<BookingItem> filter(
            String keyword,
            Long bookingId,
            Long seatId,
            Double minPrice,
            Double maxPrice) {
        return Specification
                .where(keywordContains(keyword))
                .and(bookingIdEquals(bookingId))
                .and(seatIdEquals(seatId))
                .and(priceGreaterThanOrEqual(minPrice))
                .and(priceLessThanOrEqual(maxPrice));
    }

    private static Specification<BookingItem> keywordContains(String keyword) {
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
                            root.get("id")
                                    .as(String.class),
                            value),
                    builder.like(
                            root.get("bookingId")
                                    .as(String.class),
                            value),
                    builder.like(
                            root.get("seatId")
                                    .as(String.class),
                            value),
                    builder.like(
                            root.get("price")
                                    .as(String.class),
                            value));
        };
    }

    private static Specification<BookingItem> bookingIdEquals(Long bookingId) {
        return (root, query, builder) -> bookingId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("bookingId"),
                        bookingId);
    }

    private static Specification<BookingItem> seatIdEquals(Long seatId) {
        return (root, query, builder) -> seatId == null
                ? builder.conjunction()
                : builder.equal(
                        root.get("seatId"),
                        seatId);
    }

    private static Specification<BookingItem> priceGreaterThanOrEqual(
            Double minPrice) {
        return (root, query, builder) -> minPrice == null
                ? builder.conjunction()
                : builder.greaterThanOrEqualTo(
                        root.get("price"),
                        minPrice);
    }

    private static Specification<BookingItem> priceLessThanOrEqual(
            Double maxPrice) {
        return (root, query, builder) -> maxPrice == null
                ? builder.conjunction()
                : builder.lessThanOrEqualTo(
                        root.get("price"),
                        maxPrice);
    }
}