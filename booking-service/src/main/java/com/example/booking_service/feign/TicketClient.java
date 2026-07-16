package com.example.booking_service.feign;

import com.example.booking_service.dto.TicketCreateRequest;
import com.example.booking_service.dto.TicketDTO;
import com.example.booking_service.fallback.TicketClientFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "ticket-service", fallback = TicketClientFallback.class)
public interface TicketClient {

    @PostMapping("/tickets/issue")
    TicketDTO issueTicket(
            @RequestBody TicketCreateRequest request,

            @RequestHeader("X-User-Role") String internalRole);

    @PostMapping("/tickets/issue-batch")
    List<TicketDTO> issueTickets(
            @RequestBody List<TicketCreateRequest> requests,

            @RequestHeader("X-User-Role") String internalRole);

    @PutMapping("/tickets/booking/{bookingId}/cancel")
    List<TicketDTO> cancelTicketsByBooking(
            @PathVariable("bookingId") Long bookingId,

            @RequestHeader("X-User-Role") String internalRole);
}
