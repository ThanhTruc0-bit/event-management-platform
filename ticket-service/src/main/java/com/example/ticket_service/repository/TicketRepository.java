package com.example.ticket_service.repository;

import com.example.ticket_service.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketRepository
        extends JpaRepository<Ticket, Long>,
        JpaSpecificationExecutor<Ticket> {

    List<Ticket>
    findByEventIdOrderByIssuedAtDesc(
            Long eventId
    );

    List<Ticket>
    findByBookingIdOrderByIssuedAtDesc(
            Long bookingId
    );

    List<Ticket>
    findByUserIdOrderByIssuedAtDesc(
            Long userId
    );

    Optional<Ticket>
    findByTicketCodeIgnoreCase(
            String ticketCode
    );

    Optional<Ticket>
    findByBookingIdAndSeatId(
            Long bookingId,
            Long seatId
    );

    boolean existsByTicketCodeIgnoreCase(
            String ticketCode
    );

    boolean
    existsByBookingIdAndSeatIdAndIdNot(
            Long bookingId,
            Long seatId,
            Long id
    );

    /*
     * Check-in nguyên tử.
     *
     * Chỉ một request có thể chuyển vé hợp lệ
     * sang USED. Request thứ hai nhận updated = 0.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE Ticket t
               SET t.status = 'USED',
                   t.usedAt = :usedAt
             WHERE t.id = :ticketId
               AND UPPER(t.status)
                   IN ('VALID', 'ACTIVE', 'PAID')
            """)
    int markTicketUsedIfValid(
            @Param("ticketId")
            Long ticketId,

            @Param("usedAt")
            LocalDateTime usedAt
    );
}