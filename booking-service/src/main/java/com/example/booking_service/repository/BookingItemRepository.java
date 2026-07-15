package com.example.booking_service.repository;

import com.example.booking_service.entity.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface BookingItemRepository
        extends JpaRepository<BookingItem, Long>,
        JpaSpecificationExecutor<BookingItem> {

    List<BookingItem> findByBookingId(
            Long bookingId);

    List<BookingItem> findByBookingIdOrderByIdAsc(
            Long bookingId);

    void deleteByBookingId(
            Long bookingId);
}