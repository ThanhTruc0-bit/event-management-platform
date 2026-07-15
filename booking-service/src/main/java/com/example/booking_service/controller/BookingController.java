package com.example.booking_service.controller;

import com.example.booking_service.dto.BookingDetailResponse;
import com.example.booking_service.dto.BookingRequest;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /*
     * ADMIN:
     * phân trang, tìm kiếm và lọc toàn bộ.
     */
    @GetMapping
    public Page<Booking> searchBookings(
            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) String status,

            @RequestParam(required = false) Long userId,

            @RequestParam(required = false) Long eventId,

            @RequestParam(required = false) Double minAmount,

            @RequestParam(required = false) Double maxAmount,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,

            @RequestParam(defaultValue = "bookingDate") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService.searchBookings(
                page,
                size,
                keyword,
                status,
                userId,
                eventId,
                minAmount,
                maxAmount,
                fromDate,
                toDate,
                sortBy,
                sortDirection,
                role);
    }

    /*
     * User chỉ xem booking của chính mình.
     * ADMIN có thể xem của user bất kỳ.
     */
    @GetMapping("/user/{userId}")
    public Page<Booking> searchBookingsByUser(
            @PathVariable Long userId,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "6") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) String status,

            @RequestParam(required = false) Long eventId,

            @RequestParam(defaultValue = "bookingDate") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .searchBookingsByUser(
                        userId,
                        page,
                        size,
                        keyword,
                        status,
                        eventId,
                        sortBy,
                        sortDirection,
                        currentUserId,
                        role);
    }

    @GetMapping("/{id}")
    public Booking getBookingById(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .getBookingById(
                        id,
                        currentUserId,
                        role);
    }

    @GetMapping("/{id}/detail")
    public BookingDetailResponse getBookingDetail(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .getBookingDetail(
                        id,
                        currentUserId,
                        role);
    }

    @PostMapping
    public Booking createBooking(
            @RequestBody BookingRequest request,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .createBooking(
                        request,
                        currentUserId,
                        role);
    }

    @PutMapping("/{id}/cancel")
    public Booking cancelBooking(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .cancelBooking(
                        id,
                        currentUserId,
                        role);
    }

    /*
     * Chỉ ADMIN dùng khi demo quản trị.
     * Payment callback nên dùng endpoint
     * nội bộ riêng ở phần Payment Service.
     */
    @PutMapping("/{id}/status")
    public Booking updateBookingStatus(
            @PathVariable Long id,

            @RequestParam String status,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return bookingService
                .updateBookingStatus(
                        id,
                        status,
                        role);
    }

    /*
     * Chỉ ADMIN được xóa.
     * Booking PAID không được xóa.
     */
    @DeleteMapping("/{id}")
    public void deleteBooking(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        bookingService.deleteBooking(
                id,
                role);
    }
}