package com.example.booking_service.repository;

import com.example.booking_service.entity.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingItemRepository
        extends JpaRepository<BookingItem, Long> {

    List<BookingItem> findByBookingId(Long bookingId);

}