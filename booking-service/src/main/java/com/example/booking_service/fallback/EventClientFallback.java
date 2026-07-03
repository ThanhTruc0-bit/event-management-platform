package com.example.booking_service.fallback;

import com.example.booking_service.dto.EventDTO;
import com.example.booking_service.feign.EventClient;
import org.springframework.stereotype.Component;

@Component
public class EventClientFallback implements EventClient {

    @Override
    public EventDTO getEventById(Long id) {
        throw new RuntimeException("Event service is unavailable. Cannot get event: " + id);
    }
}