package com.example.booking_service.fallback;

import com.example.booking_service.dto.TicketCreateRequest;
import com.example.booking_service.dto.TicketDTO;
import com.example.booking_service.feign.TicketClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Component
public class TicketClientFallback
        implements TicketClient {

    @Override
    public TicketDTO issueTicket(
            TicketCreateRequest request,
            String internalRole) {
        throw serviceUnavailable(
                "Cannot issue ticket.");
    }

    @Override
    public List<TicketDTO> issueTickets(
            List<TicketCreateRequest> requests,
            String internalRole) {
        int ticketCount = requests == null
                ? 0
                : requests.size();

        throw serviceUnavailable(
                "Cannot issue "
                        + ticketCount
                        + " tickets.");
    }

    @Override
    public List<TicketDTO> cancelTicketsByBooking(
            Long bookingId,
            String internalRole) {
        throw serviceUnavailable(
                "Cannot cancel tickets for booking: "
                        + bookingId);
    }

    private ResponseStatusException serviceUnavailable(
            String message) {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Ticket Service is unavailable. "
                        + message);
    }
}