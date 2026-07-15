package com.example.ticket_service.repository;

import com.example.ticket_service.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends
        JpaRepository<Ticket, Long>,
        JpaSpecificationExecutor<Ticket> {

    List<Ticket> findByEventIdOrderByIssuedAtDesc(Long eventId);

    List<Ticket> findByBookingIdOrderByIssuedAtDesc(Long bookingId);

    List<Ticket> findByUserIdOrderByIssuedAtDesc(Long userId);

    Optional<Ticket> findByTicketCode(String ticketCode);

    Optional<Ticket> findByBookingIdAndSeatId(
            Long bookingId,
            Long seatId
    );

    boolean existsByTicketCode(String ticketCode);
}