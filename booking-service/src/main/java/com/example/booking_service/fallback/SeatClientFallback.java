package com.example.booking_service.fallback;

import com.example.booking_service.dto.SeatDTO;
import com.example.booking_service.feign.SeatClient;
import org.springframework.stereotype.Component;

@Component
public class SeatClientFallback implements SeatClient {

    @Override
    public SeatDTO getSeatById(Long id) {
        throw new RuntimeException("Seat service is unavailable. Cannot get seat: " + id);
    }

    @Override
    public SeatDTO updateSeatStatus(Long id, String status) {
        throw new RuntimeException("Seat service is unavailable. Cannot update seat: " + id);
    }

    @Override
    public SeatDTO reserveSeat(Long id, Long eventId) {
        throw new RuntimeException("Seat service is unavailable. Cannot reserve seat: " + id);
    }
}