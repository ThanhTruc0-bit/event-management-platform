package com.example.ticket_service.repository;

import com.example.ticket_service.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByEventId(Long eventId);

    List<Ticket> findByBookingId(Long bookingId);

    List<Ticket> findByUserId(Long userId);

    Optional<Ticket> findByTicketCode(String ticketCode);

    Optional<Ticket> findByBookingIdAndSeatId(Long bookingId, Long seatId);
}