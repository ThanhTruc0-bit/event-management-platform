package com.example.booking_service.feign;

import com.example.booking_service.dto.SeatDTO;
import com.example.booking_service.fallback.SeatClientFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
        name = "seat-service",
        fallback = SeatClientFallback.class
)
public interface SeatClient {

    @GetMapping("/seats/{id}")
    SeatDTO getSeatById(@PathVariable Long id);

    @PutMapping("/seats/{id}/status")
    SeatDTO updateSeatStatus(
            @PathVariable Long id,
            @RequestParam String status
    );
}