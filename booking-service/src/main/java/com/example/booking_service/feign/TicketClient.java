package com.example.booking_service.feign;

import com.example.booking_service.dto.TicketCreateRequest;
import com.example.booking_service.dto.TicketDTO;
import com.example.booking_service.fallback.TicketClientFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
        name = "ticket-service",
        fallback = TicketClientFallback.class
)
public interface TicketClient {

    @PostMapping("/tickets/issue")
    TicketDTO issueTicket(@RequestBody TicketCreateRequest request);

    @PutMapping("/tickets/booking/{bookingId}/cancel")
    List<TicketDTO> cancelTicketsByBooking(@PathVariable Long bookingId);
}