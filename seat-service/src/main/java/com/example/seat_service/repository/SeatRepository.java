package com.example.seat_service.repository;

import com.example.seat_service.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByEventId(Long eventId);

    boolean existsByEventIdAndSeatNumber(Long eventId, String seatNumber);
}