package com.example.booking_service.feign;

import com.example.booking_service.dto.EventDTO;
import com.example.booking_service.fallback.EventClientFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "event-service", fallback = EventClientFallback.class)
public interface EventClient {

    @GetMapping("/events/{id}")
    EventDTO getEventById(@PathVariable("id") Long id);
}