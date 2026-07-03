package com.example.booking_service.controller;

import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.service.BookingItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/booking-items")
@RequiredArgsConstructor
public class BookingItemController {

    private final BookingItemService bookingItemService;

    @GetMapping
    public List<BookingItem> getAllBookingItems() {
        return bookingItemService.getAllBookingItems();
    }

    @GetMapping("/{id}")
    public BookingItem getBookingItemById(@PathVariable Long id) {
        return bookingItemService.getBookingItemById(id);
    }

    @GetMapping("/booking/{bookingId}")
    public List<BookingItem> getBookingItemsByBooking(@PathVariable Long bookingId) {
        return bookingItemService.getBookingItemsByBooking(bookingId);
    }

    @PostMapping
    public BookingItem createBookingItem(@RequestBody BookingItem bookingItem) {
        return bookingItemService.createBookingItem(bookingItem);
    }

    @PutMapping("/{id}")
    public BookingItem updateBookingItem(
            @PathVariable Long id,
            @RequestBody BookingItem bookingItem
    ) {
        return bookingItemService.updateBookingItem(id, bookingItem);
    }

    @DeleteMapping("/{id}")
    public void deleteBookingItem(@PathVariable Long id) {
        bookingItemService.deleteBookingItem(id);
    }
}