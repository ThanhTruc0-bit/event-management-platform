package com.example.booking_service.service;

import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.repository.BookingItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingItemService {

    private final BookingItemRepository bookingItemRepository;

    public List<BookingItem> getAllBookingItems() {
        return bookingItemRepository.findAll();
    }

    public BookingItem getBookingItemById(Long id) {
        return bookingItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking item not found: " + id));
    }

    public List<BookingItem> getBookingItemsByBooking(Long bookingId) {
        return bookingItemRepository.findByBookingId(bookingId);
    }

    public BookingItem createBookingItem(BookingItem bookingItem) {
        return bookingItemRepository.save(bookingItem);
    }

    public BookingItem updateBookingItem(Long id, BookingItem bookingItem) {
        BookingItem oldItem = bookingItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking item not found: " + id));

        oldItem.setBookingId(bookingItem.getBookingId());
        oldItem.setSeatId(bookingItem.getSeatId());
        oldItem.setPrice(bookingItem.getPrice());

        return bookingItemRepository.save(oldItem);
    }

    public void deleteBookingItem(Long id) {
        bookingItemRepository.deleteById(id);
    }
}