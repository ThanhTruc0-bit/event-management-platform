package com.example.seat_service.service;

import com.example.seat_service.dto.GenerateSeatsRequest;
import com.example.seat_service.entity.Seat;
import com.example.seat_service.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final SeatRepository seatRepository;

    public List<Seat> getAllSeats() {
        return seatRepository.findAll();
    }

    public List<Seat> getSeatsByEvent(Long eventId) {
        return seatRepository.findByEventId(eventId);
    }

    public Seat getSeatById(Long id) {
        return seatRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat not found: " + id));
    }

    public Seat createSeat(Seat seat) {
        if (seat.getStatus() == null || seat.getStatus().isBlank()) {
            seat.setStatus("AVAILABLE");
        }

        if (seat.getSeatType() == null || seat.getSeatType().isBlank()) {
            seat.setSeatType("STANDARD");
        }

        return seatRepository.save(seat);
    }

    public List<Seat> generateSeats(GenerateSeatsRequest request) {
        if (request.getEventId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId is required");
        }

        if (request.getPrefix() == null || request.getPrefix().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "prefix is required");
        }

        if (request.getStartNumber() == null || request.getEndNumber() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "startNumber and endNumber are required");
        }

        if (request.getStartNumber() > request.getEndNumber()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "startNumber must be less than or equal to endNumber");
        }

        int total = request.getEndNumber() - request.getStartNumber() + 1;

        if (total > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot generate more than 1000 seats at once");
        }

        String prefix = request.getPrefix().trim().toUpperCase();
        String seatType = request.getSeatType();

        if (seatType == null || seatType.isBlank()) {
            seatType = "STANDARD";
        }

        String status = request.getStatus();

        if (status == null || status.isBlank()) {
            status = "AVAILABLE";
        }

        List<Seat> seatsToSave = new ArrayList<>();

        for (int i = request.getStartNumber(); i <= request.getEndNumber(); i++) {
            String seatNumber = prefix + i;

            boolean exists = seatRepository.existsByEventIdAndSeatNumber(
                    request.getEventId(),
                    seatNumber);

            if (exists) {
                continue;
            }

            Seat seat = new Seat();
            seat.setEventId(request.getEventId());
            seat.setSeatNumber(seatNumber);
            seat.setSeatType(seatType);
            seat.setStatus(status);
            seat.setPrice(request.getPrice());

            seatsToSave.add(seat);
        }

        return seatRepository.saveAll(seatsToSave);
    }

    public Seat updateSeat(Long id, Seat seat) {
        Seat oldSeat = seatRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat not found: " + id));

        oldSeat.setEventId(seat.getEventId());
        oldSeat.setSeatNumber(seat.getSeatNumber());
        oldSeat.setSeatType(seat.getSeatType());
        oldSeat.setStatus(seat.getStatus());
        oldSeat.setPrice(seat.getPrice());

        return seatRepository.save(oldSeat);
    }

    public Seat updateSeatStatus(Long id, String status) {
        Seat seat = seatRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat not found: " + id));

        seat.setStatus(status);

        return seatRepository.save(seat);
    }

    public void deleteSeat(Long id) {
        if (!seatRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Seat not found: " + id);
        }

        seatRepository.deleteById(id);
    }

    @Transactional
    public Seat reserveSeat(Long id, Long eventId) {
        if (eventId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId is required");
        }

        int updated = seatRepository.reserveSeatIfAvailable(id, eventId);

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ghế đã có người khác giữ hoặc đã được bán: " + id);
        }

        return seatRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat not found: " + id));
    }
}