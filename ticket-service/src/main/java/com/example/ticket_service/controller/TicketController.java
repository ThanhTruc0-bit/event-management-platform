package com.example.ticket_service.controller;

import com.example.ticket_service.dto.TicketCreateRequest;
import com.example.ticket_service.entity.Ticket;
import com.example.ticket_service.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    /*
     * API dành cho Admin.
     *
     * /tickets?page=0&size=10
     * /tickets?keyword=TKT
     * /tickets?status=VALID
     * /tickets?ticketType=VIP
     * /tickets?userId=1
     * /tickets?eventId=3
     * /tickets?bookingId=1
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

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            @RequestParam(defaultValue = "issuedAt")
            String sortBy,

            @RequestParam(defaultValue = "desc")
            String sortDirection
    ) {
        return ticketService.searchTickets(
                keyword,
                status,
                userId,
                eventId,
                bookingId,
                ticketType,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    /*
     * API phân trang dành cho User.
     */
    @GetMapping("/user/{userId}/page")
    public Page<Ticket> searchTicketsByUser(
            @PathVariable Long userId,

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
            String sortDirection
    ) {
        return ticketService.searchTicketsByUser(
                userId,
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
     * API phân trang theo Booking.
     */
    @GetMapping("/booking/{bookingId}/page")
    public Page<Ticket> searchTicketsByBooking(
            @PathVariable Long bookingId,

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
            String sortDirection
    ) {
        return ticketService.searchTicketsByBooking(
                bookingId,
                keyword,
                status,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    @GetMapping("/event/{eventId}/page")
    public Page<Ticket> searchTicketsByEvent(
            @PathVariable Long eventId,

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
            String sortDirection
    ) {
        return ticketService.searchTicketsByEvent(
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
     * Các API List cũ được giữ lại để PaymentResult,
     * BookingDetail và các trang cũ không bị lỗi.
     */
    @GetMapping("/event/{eventId}")
    public List<Ticket> getTicketsByEvent(
            @PathVariable Long eventId
    ) {
        return ticketService.getTicketsByEvent(eventId);
    }

    @GetMapping("/booking/{bookingId}")
    public List<Ticket> getTicketsByBooking(
            @PathVariable Long bookingId
    ) {
        return ticketService.getTicketsByBooking(bookingId);
    }

    @GetMapping("/user/{userId}")
    public List<Ticket> getTicketsByUser(
            @PathVariable Long userId
    ) {
        return ticketService.getTicketsByUser(userId);
    }

    @GetMapping("/code/{ticketCode}")
    public Ticket getTicketByCode(
            @PathVariable String ticketCode
    ) {
        return ticketService.getTicketByCode(ticketCode);
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(
            @PathVariable Long id
    ) {
        return ticketService.getTicketById(id);
    }

    @PostMapping
    public Ticket createTicket(
            @RequestBody Ticket ticket
    ) {
        return ticketService.createTicket(ticket);
    }

    @PostMapping("/issue")
    public Ticket issueTicket(
            @RequestBody TicketCreateRequest request
    ) {
        return ticketService.issueTicket(request);
    }

    @PostMapping("/issue-batch")
    public List<Ticket> issueTickets(
            @RequestBody List<TicketCreateRequest> requests
    ) {
        return ticketService.issueTickets(requests);
    }

    @PutMapping("/{id}")
    public Ticket updateTicket(
            @PathVariable Long id,
            @RequestBody Ticket ticket
    ) {
        return ticketService.updateTicket(id, ticket);
    }

    @PutMapping("/{id}/use")
    public Ticket useTicket(
            @PathVariable Long id
    ) {
        return ticketService.useTicket(id);
    }

    @PutMapping("/code/{ticketCode}/use")
    public Ticket useTicketByCode(
            @PathVariable String ticketCode
    ) {
        return ticketService.useTicketByCode(ticketCode);
    }

    @PutMapping("/{id}/regenerate-code")
    public Ticket regenerateTicketCode(
            @PathVariable Long id
    ) {
        return ticketService.regenerateTicketCode(id);
    }

    @PutMapping("/booking/{bookingId}/cancel")
    public List<Ticket> cancelTicketsByBooking(
            @PathVariable Long bookingId
    ) {
        return ticketService.cancelTicketsByBooking(bookingId);
    }

    @DeleteMapping("/{id}")
    public void deleteTicket(
            @PathVariable Long id
    ) {
        ticketService.deleteTicket(id);
    }
}