package com.example.booking_service.fallback;

import com.example.booking_service.dto.TicketCreateRequest;
import com.example.booking_service.dto.TicketDTO;
import com.example.booking_service.feign.TicketClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TicketClientFallback implements TicketClient {

    @Override
    public TicketDTO issueTicket(TicketCreateRequest request) {
        throw new RuntimeException("Ticket service is unavailable. Cannot issue ticket.");
    }

    @Override
    public List<TicketDTO> cancelTicketsByBooking(Long bookingId) {
        throw new RuntimeException("Ticket service is unavailable. Cannot cancel tickets.");
    }
}