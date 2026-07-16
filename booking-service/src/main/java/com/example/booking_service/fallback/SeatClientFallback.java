package com.example.booking_service.fallback;

import com.example.booking_service.dto.SeatDTO;
import com.example.booking_service.feign.SeatClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SeatClientFallback implements SeatClient {

    @Override
    public SeatDTO getSeatById(Long id) {
        throw serviceUnavailable(
                "Cannot get seat: " + id);
    }

    @Override
    public SeatDTO updateSeatStatus(
            Long id,
            String status) {
        throw serviceUnavailable(
                "Cannot update seat: " + id);
    }

    @Override
    public SeatDTO reserveSeat(
            Long id,
            Long eventId) {
        throw serviceUnavailable(
                "Cannot reserve seat: " + id);
    }

    private ResponseStatusException serviceUnavailable(
            String message) {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Seat Service is unavailable. " + message);
    }
}