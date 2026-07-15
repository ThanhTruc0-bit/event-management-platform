package com.example.seat_service.repository;

import com.example.seat_service.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByEventId(Long eventId);

    boolean existsByEventIdAndSeatNumber(Long eventId, String seatNumber);

    @Modifying
    @Query("""
                UPDATE Seat s
                SET s.status = 'RESERVED'
                WHERE s.id = :seatId
                  AND s.eventId = :eventId
                  AND UPPER(s.status) = 'AVAILABLE'
            """)
    int reserveSeatIfAvailable(
            @Param("seatId") Long seatId,
            @Param("eventId") Long eventId);
}