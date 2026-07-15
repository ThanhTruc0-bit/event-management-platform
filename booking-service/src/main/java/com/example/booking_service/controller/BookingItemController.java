package com.example.booking_service.controller;

import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.service.BookingItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/booking-items")
@RequiredArgsConstructor
public class BookingItemController {

    private final BookingItemService bookingItemService;

    /*
     * Chỉ ADMIN được xem toàn bộ
     * Booking Item.
     */
    @GetMapping
    public Page<BookingItem> searchBookingItems(
            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long bookingId,

            @RequestParam(required = false) Long seatId,

            @RequestParam(required = false) Double minPrice,

            @RequestParam(required = false) Double maxPrice,

            @RequestParam(defaultValue = "id") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingItemService
                .searchBookingItems(
                        page,
                        size,
                        keyword,
                        bookingId,
                        seatId,
                        minPrice,
                        maxPrice,
                        sortBy,
                        sortDirection,
                        role);
    }

    /*
     * Owner của booking hoặc ADMIN.
     */
    @GetMapping("/{id}")
    public BookingItem getBookingItemById(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingItemService
                .getBookingItemById(
                        id,
                        currentUserId,
                        role);
    }

    /*
     * Owner của booking hoặc ADMIN.
     */
    @GetMapping("/booking/{bookingId}")
    public List<BookingItem> getBookingItemsByBooking(
            @PathVariable Long bookingId,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingItemService
                .getBookingItemsByBooking(
                        bookingId,
                        currentUserId,
                        role);
    }

    /*
     * Không còn POST, PUT, DELETE.
     * Booking Item chỉ được tạo tự động
     * trong BookingService.
     */
}