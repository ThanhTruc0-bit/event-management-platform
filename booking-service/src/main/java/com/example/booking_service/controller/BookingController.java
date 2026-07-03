package com.example.booking_service.controller;

import com.example.booking_service.dto.BookingDetailResponse;
import com.example.booking_service.dto.BookingRequest;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping
    public List<Booking> getAllBookings(
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.getAllBookings(role);
    }

    @GetMapping("/{id}")
    public Booking getBookingById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.getBookingById(id, currentUserId, role);
    }

    @GetMapping("/{id}/detail")
    public BookingDetailResponse getBookingDetail(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.getBookingDetail(id, currentUserId, role);
    }

    @GetMapping("/user/{userId}")
    public List<Booking> getBookingsByUser(
            @PathVariable Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.getBookingsByUser(userId, currentUserId, role);
    }

    @PostMapping
    public Booking createBooking(
            @RequestBody BookingRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.createBooking(request, currentUserId, role);
    }

    @PutMapping("/{id}/cancel")
    public Booking cancelBooking(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.cancelBooking(id, currentUserId, role);
    }

    @PutMapping("/{id}/status")
    public Booking updateBookingStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        return bookingService.updateBookingStatus(id, status, role);
    }

    @DeleteMapping("/{id}")
    public void deleteBooking(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        bookingService.deleteBooking(id, currentUserId, role);
    }
}