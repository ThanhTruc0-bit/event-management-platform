package com.example.booking_service.fallback;

import com.example.booking_service.dto.EventDTO;
import com.example.booking_service.feign.EventClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class EventClientFallback implements EventClient {

    @Override
    public EventDTO getEventById(Long id) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Event Service đang tạm dừng. Circuit Breaker fallback đã được kích hoạt. Cannot get event: " + id);
    }
}