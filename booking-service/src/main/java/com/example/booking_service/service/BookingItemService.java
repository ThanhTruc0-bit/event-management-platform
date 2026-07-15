package com.example.booking_service.service;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.repository.BookingItemRepository;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.specification.BookingItemSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BookingItemService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "bookingId",
            "seatId",
            "price");

    private final BookingItemRepository bookingItemRepository;

    private final BookingRepository bookingRepository;

    public Page<BookingItem> searchBookingItems(
            int page,
            int size,
            String keyword,
            Long bookingId,
            Long seatId,
            Double minPrice,
            Double maxPrice,
            String sortBy,
            String sortDirection,
            String role) {
        requireAdmin(role);
        validatePage(page, size);
        validatePriceRange(
                minPrice,
                maxPrice);

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(
                        sortBy,
                        sortDirection));

        return bookingItemRepository.findAll(
                BookingItemSpecification.filter(
                        keyword,
                        bookingId,
                        seatId,
                        minPrice,
                        maxPrice),
                pageable);
    }

    public BookingItem getBookingItemById(
            Long id,
            Long currentUserId,
            String role) {
        BookingItem item = bookingItemRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking item not found: "
                                        + id));

        Booking booking = findBooking(
                item.getBookingId());

        checkOwnerOrAdmin(
                booking.getUserId(),
                currentUserId,
                role);

        return item;
    }

    public List<BookingItem> getBookingItemsByBooking(
            Long bookingId,
            Long currentUserId,
            String role) {
        Booking booking = findBooking(bookingId);

        checkOwnerOrAdmin(
                booking.getUserId(),
                currentUserId,
                role);

        return bookingItemRepository
                .findByBookingIdOrderByIdAsc(
                        bookingId);
    }

    private Booking findBooking(
            Long bookingId) {
        return bookingRepository
                .findById(bookingId)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found: "
                                        + bookingId));
    }

    private void checkOwnerOrAdmin(
            Long ownerUserId,
            Long currentUserId,
            String role) {
        if (isAdmin(role)) {
            return;
        }

        if (currentUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Missing user token");
        }

        if (!ownerUserId.equals(
                currentUserId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot access another user's booking items");
        }
    }

    private void requireAdmin(
            String role) {
        if (!isAdmin(role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "ADMIN role is required");
        }
    }

    private boolean isAdmin(
            String role) {
        if (role == null) {
            return false;
        }

        String normalized = role
                .trim()
                .toUpperCase();

        return "ADMIN".equals(normalized)
                || "ROLE_ADMIN".equals(
                        normalized);
    }

    private void validatePage(
            int page,
            int size) {
        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page must be greater than or equal to 0");
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "size must be between 1 and 100");
        }
    }

    private void validatePriceRange(
            Double minPrice,
            Double maxPrice) {
        if (minPrice != null
                && minPrice < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "minPrice cannot be negative");
        }

        if (maxPrice != null
                && maxPrice < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "maxPrice cannot be negative");
        }

        if (minPrice != null
                && maxPrice != null
                && minPrice > maxPrice) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "minPrice must be less than or equal to maxPrice");
        }
    }

    private Sort createSort(
            String sortBy,
            String sortDirection) {
        String field = ALLOWED_SORT_FIELDS
                .contains(sortBy)
                        ? sortBy
                        : "id";

        Sort.Direction direction = "asc".equalsIgnoreCase(
                sortDirection)
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        return Sort.by(
                direction,
                field);
    }
}