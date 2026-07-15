package com.example.event_service.feign;

import com.example.event_service.dto.SeatDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "seat-service")
public interface SeatClient {

    @GetMapping("/seats/event/{eventId}")
    List<SeatDTO> getSeatsByEvent(
            @PathVariable("eventId") Long eventId);
}