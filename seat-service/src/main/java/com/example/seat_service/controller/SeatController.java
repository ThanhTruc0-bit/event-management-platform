package com.example.seat_service.controller;

import com.example.seat_service.dto.GenerateSeatsRequest;
import com.example.seat_service.entity.Seat;
import com.example.seat_service.service.SeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    @GetMapping
    public List<Seat> getAllSeats() {
        return seatService.getAllSeats();
    }

    @GetMapping("/event/{eventId}")
    public List<Seat> getSeatsByEvent(@PathVariable Long eventId) {
        return seatService.getSeatsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public Seat getSeatById(@PathVariable Long id) {
        return seatService.getSeatById(id);
    }

    @PostMapping
    public Seat createSeat(@RequestBody Seat seat) {
        return seatService.createSeat(seat);
    }

    @PostMapping("/generate")
    public List<Seat> generateSeats(@RequestBody GenerateSeatsRequest request) {
        return seatService.generateSeats(request);
    }

    @PutMapping("/{id}")
    public Seat updateSeat(
            @PathVariable Long id,
            @RequestBody Seat seat
    ) {
        return seatService.updateSeat(id, seat);
    }

    @PutMapping("/{id}/status")
    public Seat updateSeatStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        return seatService.updateSeatStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void deleteSeat(@PathVariable Long id) {
        seatService.deleteSeat(id);
    }
}