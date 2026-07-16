package com.example.ticket_service.controller;

import com.example.ticket_service.dto.TicketCreateRequest;
import com.example.ticket_service.entity.Ticket;
import com.example.ticket_service.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    /*
     * =====================================================
     * ADMIN SEARCH
     * =====================================================
     */
    @GetMapping
    public Page<Ticket> searchTickets(
            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            Long userId,

            @RequestParam(required = false)
            Long eventId,

            @RequestParam(required = false)
            Long bookingId,

            @RequestParam(required = false)
            String ticketType,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime toDate,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "issuedAt")
            String sortBy,

            @RequestParam(defaultValue = "desc")
            String sortDirection,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService.searchTickets(
                keyword,
                status,
                userId,
                eventId,
                bookingId,
                ticketType,
                fromDate,
                toDate,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    /*
     * =====================================================
     * USER TICKETS
     * =====================================================
     */
    @GetMapping("/user/{userId}/page")
    public Page<Ticket> searchTicketsByUser(
            @PathVariable
            Long userId,

            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            String ticketType,

            @RequestParam(required = false)
            Long eventId,

            @RequestParam(required = false)
            Long bookingId,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "issuedAt")
            String sortBy,

            @RequestParam(defaultValue = "desc")
            String sortDirection,

            @RequestHeader(
                    value = "X-User-Id",
                    required = false
            )
            Long currentUserId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        return ticketService
                .searchTicketsByUser(
                        userId,
                        currentUserId,
                        currentRole,
                        keyword,
                        status,
                        ticketType,
                        eventId,
                        bookingId,
                        page,
                        size,
                        sortBy,
                        sortDirection
                );
    }

    /*
     * =====================================================
     * BOOKING TICKETS
     * =====================================================
     */
    @GetMapping("/booking/{bookingId}/page")
    public Page<Ticket> searchTicketsByBooking(
            @PathVariable
            Long bookingId,

            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            String status,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "issuedAt")
            String sortBy,

            @RequestParam(defaultValue = "desc")
            String sortDirection,

            @RequestHeader(
                    value = "X-User-Id",
                    required = false
            )
            Long currentUserId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        return ticketService
                .searchTicketsByBooking(
                        bookingId,
                        currentUserId,
                        currentRole,
                        keyword,
                        status,
                        page,
                        size,
                        sortBy,
                        sortDirection
                );
    }

    /*
     * =====================================================
     * EVENT TICKETS - ADMIN
     * =====================================================
     */
    @GetMapping("/event/{eventId}/page")
    public Page<Ticket> searchTicketsByEvent(
            @PathVariable
            Long eventId,

            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            String ticketType,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "issuedAt")
            String sortBy,

            @RequestParam(defaultValue = "desc")
            String sortDirection,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .searchTicketsByEvent(
                        eventId,
                        keyword,
                        status,
                        ticketType,
                        page,
                        size,
                        sortBy,
                        sortDirection
                );
    }

    /*
     * =====================================================
     * LIST API CŨ
     * =====================================================
     */
    @GetMapping("/event/{eventId}")
    public List<Ticket> getTicketsByEvent(
            @PathVariable Long eventId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .getTicketsByEvent(
                        eventId
                );
    }

    @GetMapping("/booking/{bookingId}")
    public List<Ticket> getTicketsByBooking(
            @PathVariable
            Long bookingId,

            @RequestHeader(
                    value = "X-User-Id",
                    required = false
            )
            Long currentUserId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        return ticketService
                .getTicketsByBookingAuthorized(
                        bookingId,
                        currentUserId,
                        currentRole
                );
    }

    @GetMapping("/user/{userId}")
    public List<Ticket> getTicketsByUser(
            @PathVariable
            Long userId,

            @RequestHeader(
                    value = "X-User-Id",
                    required = false
            )
            Long currentUserId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        return ticketService
                .getTicketsByUserAuthorized(
                        userId,
                        currentUserId,
                        currentRole
                );
    }

    /*
     * =====================================================
     * GET ONE
     * =====================================================
     */
    @GetMapping("/code/{ticketCode}")
    public Ticket getTicketByCode(
            @PathVariable
            String ticketCode,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .getTicketByCode(
                        ticketCode
                );
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(
            @PathVariable
            Long id,

            @RequestHeader(
                    value = "X-User-Id",
                    required = false
            )
            Long currentUserId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        return ticketService
                .getTicketByIdAuthorized(
                        id,
                        currentUserId,
                        currentRole
                );
    }

    /*
     * =====================================================
     * INTERNAL / ADMIN WRITE
     * =====================================================
     */
    @PostMapping
    public Ticket createTicket(
            @RequestBody
            Ticket ticket,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .createTicket(ticket);
    }

    @PostMapping("/issue")
    public Ticket issueTicket(
            @RequestBody
            TicketCreateRequest request,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .issueTicket(request);
    }

    @PostMapping("/issue-batch")
    public List<Ticket> issueTickets(
            @RequestBody
            List<TicketCreateRequest> requests,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .issueTickets(requests);
    }

    @PutMapping("/{id}")
    public Ticket updateTicket(
            @PathVariable
            Long id,

            @RequestBody
            Ticket ticket,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .updateTicket(
                        id,
                        ticket
                );
    }

    @PutMapping("/{id}/use")
    public Ticket useTicket(
            @PathVariable
            Long id,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService.useTicket(id);
    }

    @PutMapping("/code/{ticketCode}/use")
    public Ticket useTicketByCode(
            @PathVariable
            String ticketCode,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .useTicketByCode(
                        ticketCode
                );
    }

    @PutMapping("/{id}/regenerate-code")
    public Ticket regenerateTicketCode(
            @PathVariable
            Long id,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .regenerateTicketCode(id);
    }

    @PutMapping("/booking/{bookingId}/cancel")
    public List<Ticket> cancelTicketsByBooking(
            @PathVariable
            Long bookingId,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        return ticketService
                .cancelTicketsByBooking(
                        bookingId
                );
    }

    @DeleteMapping("/{id}")
    public void deleteTicket(
            @PathVariable
            Long id,

            @RequestHeader(
                    value = "X-User-Role",
                    required = false
            )
            String currentRole
    ) {
        ticketService.requireAdmin(
                currentRole
        );

        ticketService.deleteTicket(id);
    }
}