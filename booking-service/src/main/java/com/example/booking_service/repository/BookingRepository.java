package com.example.booking_service.repository;

import com.example.booking_service.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository
                extends JpaRepository<Booking, Long>,
                JpaSpecificationExecutor<Booking> {

        boolean existsByBookingCode(
                        String bookingCode);

        List<Booking> findByStatusIgnoreCaseAndExpiresAtBefore(
                        String status,
                        LocalDateTime currentTime);

        @Query("""
                        SELECT COUNT(item)
                        FROM Booking booking, BookingItem item
                        WHERE item.bookingId = booking.id
                          AND booking.userId = :userId
                          AND booking.eventId = :eventId
                          AND UPPER(booking.status) IN ('PENDING', 'PAID')
                        """)
        long countActiveTicketsByUserIdAndEventId(
                        @Param("userId") Long userId,
                        @Param("eventId") Long eventId);
}