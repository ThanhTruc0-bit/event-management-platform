package com.example.ticket_service.controller;

import com.example.ticket_service.dto.TicketCreateRequest;
import com.example.ticket_service.entity.Ticket;
import com.example.ticket_service.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    public List<Ticket> getAllTickets() {
        return ticketService.getAllTickets();
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    @GetMapping("/event/{eventId}")
    public List<Ticket> getTicketsByEvent(@PathVariable Long eventId) {
        return ticketService.getTicketsByEvent(eventId);
    }

    @GetMapping("/booking/{bookingId}")
    public List<Ticket> getTicketsByBooking(@PathVariable Long bookingId) {
        return ticketService.getTicketsByBooking(bookingId);
    }

    @GetMapping("/user/{userId}")
    public List<Ticket> getTicketsByUser(@PathVariable Long userId) {
        return ticketService.getTicketsByUser(userId);
    }

    @PostMapping
    public Ticket createTicket(@RequestBody Ticket ticket) {
        return ticketService.createTicket(ticket);
    }

    @PostMapping("/issue")
    public Ticket issueTicket(@RequestBody TicketCreateRequest request) {
        return ticketService.issueTicket(request);
    }

    @PostMapping("/issue-batch")
    public List<Ticket> issueTickets(@RequestBody List<TicketCreateRequest> requests) {
        return ticketService.issueTickets(requests);
    }

    @PutMapping("/{id}")
    public Ticket updateTicket(@PathVariable Long id, @RequestBody Ticket ticket) {
        return ticketService.updateTicket(id, ticket);
    }

    @PutMapping("/{id}/use")
    public Ticket useTicket(@PathVariable Long id) {
        return ticketService.useTicket(id);
    }

    @PutMapping("/code/{ticketCode}/use")
    public Ticket useTicketByCode(@PathVariable String ticketCode) {
        return ticketService.useTicketByCode(ticketCode);
    }

    @PutMapping("/booking/{bookingId}/cancel")
    public List<Ticket> cancelTicketsByBooking(@PathVariable Long bookingId) {
        return ticketService.cancelTicketsByBooking(bookingId);
    }

    @DeleteMapping("/{id}")
    public void deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
    }
}