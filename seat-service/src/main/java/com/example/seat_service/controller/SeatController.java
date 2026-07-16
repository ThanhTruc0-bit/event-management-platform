package com.example.seat_service.controller;

import com.example.seat_service.dto.GenerateSeatsRequest;
import com.example.seat_service.entity.Seat;
import com.example.seat_service.service.SeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    /*
     * Danh sách dành cho Admin.
     *
     * Hỗ trợ:
     * - Phân trang
     * - Tìm kiếm
     * - Lọc event
     * - Lọc loại ghế
     * - Lọc trạng thái
     * - Lọc khoảng giá
     * - Sắp xếp
     */
    @GetMapping
    public Page<Seat> getSeats(
            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long eventId,

            @RequestParam(required = false) String seatType,

            @RequestParam(required = false) String status,

            @RequestParam(required = false) Double minPrice,

            @RequestParam(required = false) Double maxPrice,

            @RequestParam(defaultValue = "id") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection) {
        return seatService.getSeats(
                page,
                size,
                keyword,
                eventId,
                seatType,
                status,
                minPrice,
                maxPrice,
                sortBy,
                sortDirection);
    }

    /*
     * Endpoint dành cho Checkout và Event Detail.
     * Giữ trả List vì cần lấy toàn bộ ghế của sự kiện.
     */
    @GetMapping("/event/{eventId}")
    public List<Seat> getSeatsByEvent(
            @PathVariable Long eventId) {
        return seatService.getSeatsByEvent(
                eventId);
    }

    @GetMapping("/{id}")
    public Seat getSeatById(
            @PathVariable Long id) {
        return seatService.getSeatById(id);
    }

    @PostMapping
    public Seat createSeat(
            @RequestBody Seat seat) {
        return seatService.createSeat(seat);
    }

    @PostMapping("/generate")
    public List<Seat> generateSeats(
            @RequestBody GenerateSeatsRequest request) {
        return seatService.generateSeats(
                request);
    }

    @PutMapping("/{id}")
    public Seat updateSeat(
            @PathVariable Long id,

            @RequestBody Seat seat) {
        return seatService.updateSeat(
                id,
                seat);
    }

    @PutMapping("/{id}/status")
    public Seat updateSeatStatus(
            @PathVariable Long id,

            @RequestParam String status) {
        return seatService.updateSeatStatus(
                id,
                status);
    }

    @PutMapping("/{id}/reserve")
    public Seat reserveSeat(
            @PathVariable Long id,

            @RequestParam Long eventId) {
        return seatService.reserveSeat(
                id,
                eventId);
    }

    @DeleteMapping("/{id}")
    public void deleteSeat(
            @PathVariable Long id) {
        seatService.deleteSeat(id);
    }
}