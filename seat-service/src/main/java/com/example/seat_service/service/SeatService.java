package com.example.seat_service.service;

import com.example.seat_service.dto.GenerateSeatsRequest;
import com.example.seat_service.entity.Seat;
import com.example.seat_service.repository.SeatRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SeatService {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "AVAILABLE",
            "RESERVED",
            "BOOKED");

    private static final Set<String> ALLOWED_SEAT_TYPES = Set.of(
            "VIP",
            "STANDARD",
            "STANDING");

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "eventId",
            "seatNumber",
            "seatType",
            "status",
            "price");

    private final SeatRepository seatRepository;

    /*
     * =====================================================
     * PHÂN TRANG + TÌM KIẾM + LỌC
     * =====================================================
     */
    public Page<Seat> getSeats(
            int page,
            int size,
            String keyword,
            Long eventId,
            String seatType,
            String status,
            Double minPrice,
            Double maxPrice,
            String sortBy,
            String sortDirection) {
        int safePage = Math.max(page, 0);

        int safeSize = Math.min(
                Math.max(size, 1),
                100);

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(
                sortBy)
                        ? sortBy
                        : "id";

        Sort.Direction direction = "asc".equalsIgnoreCase(
                sortDirection)
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        direction,
                        safeSortBy));

        Specification<Seat> specification = Specification.where(null);

        /*
         * Tìm kiếm theo:
         * - Seat ID
         * - Event ID
         * - Seat number
         * - Seat type
         * - Status
         */
        if (keyword != null &&
                !keyword.isBlank()) {
            String searchValue = keyword.trim();

            String likeValue = "%"
                    + searchValue
                            .toLowerCase()
                    + "%";

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> {
                        List<Predicate> predicates = new ArrayList<>();

                        predicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "seatNumber")),
                                        likeValue));

                        predicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "seatType")),
                                        likeValue));

                        predicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "status")),
                                        likeValue));

                        try {
                            Long number = Long.valueOf(
                                    searchValue);

                            predicates.add(
                                    criteriaBuilder.equal(
                                            root.get("id"),
                                            number));

                            predicates.add(
                                    criteriaBuilder.equal(
                                            root.get(
                                                    "eventId"),
                                            number));
                        } catch (NumberFormatException ignored) {
                            // Keyword không phải số.
                        }

                        return criteriaBuilder.or(
                                predicates.toArray(
                                        new Predicate[0]));
                    });
        }

        if (eventId != null) {
            if (eventId <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "eventId must be greater than 0");
            }

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> criteriaBuilder.equal(
                                    root.get(
                                            "eventId"),
                                    eventId));
        }

        if (seatType != null &&
                !seatType.isBlank()) {
            String normalizedType = normalizeSeatType(
                    seatType);

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> criteriaBuilder.equal(
                                    criteriaBuilder.upper(
                                            root.<String>get(
                                                    "seatType")),
                                    normalizedType));
        }

        if (status != null &&
                !status.isBlank()) {
            String normalizedStatus = normalizeStatus(status);

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> criteriaBuilder.equal(
                                    criteriaBuilder.upper(
                                            root.<String>get(
                                                    "status")),
                                    normalizedStatus));
        }

        if (minPrice != null) {
            if (minPrice < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "minPrice cannot be negative");
            }

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> criteriaBuilder
                                    .greaterThanOrEqualTo(
                                            root.get(
                                                    "price"),
                                            minPrice));
        }

        if (maxPrice != null) {
            if (maxPrice < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "maxPrice cannot be negative");
            }

            specification = specification.and(
                    (
                            root,
                            query,
                            criteriaBuilder) -> criteriaBuilder
                                    .lessThanOrEqualTo(
                                            root.get(
                                                    "price"),
                                            maxPrice));
        }

        if (minPrice != null &&
                maxPrice != null &&
                minPrice > maxPrice) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "minPrice must be less than or equal to maxPrice");
        }

        return seatRepository.findAll(
                specification,
                pageable);
    }

    /*
     * =====================================================
     * LẤY DỮ LIỆU
     * =====================================================
     */
    public List<Seat> getSeatsByEvent(
            Long eventId) {
        validateEventId(eventId);

        return seatRepository
                .findByEventIdOrderBySeatTypeAscSeatNumberAsc(
                        eventId);
    }

    public Seat getSeatById(
            Long id) {
        return seatRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Seat not found: "
                                        + id));
    }

    /*
     * =====================================================
     * TẠO GHẾ
     * =====================================================
     */
    public Seat createSeat(
            Seat request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Seat request is required");
        }

        Seat seat = new Seat();

        applyAndValidateSeatData(
                seat,
                request,
                null);

        try {
            return seatRepository.save(
                    seat);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seat number already exists in this event");
        }
    }

    /*
     * =====================================================
     * TẠO GHẾ HÀNG LOẠT
     * =====================================================
     */
    @Transactional
    public List<Seat> generateSeats(
            GenerateSeatsRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Generate seats request is required");
        }

        validateEventId(
                request.getEventId());

        if (request.getPrefix() == null ||
                request.getPrefix().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "prefix is required");
        }

        if (request.getStartNumber() == null ||
                request.getEndNumber() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "startNumber and endNumber are required");
        }

        if (request.getStartNumber() < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "startNumber must be greater than or equal to 1");
        }

        if (request.getStartNumber() > request.getEndNumber()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "startNumber must be less than or equal to endNumber");
        }

        int total = request.getEndNumber()
                - request.getStartNumber()
                + 1;

        if (total > 1000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot generate more than 1000 seats at once");
        }

        String prefix = request.getPrefix()
                .trim()
                .toUpperCase();

        if (prefix.length() > 80) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "prefix is too long");
        }

        String seatType = normalizeSeatType(
                request.getSeatType());

        String status = normalizeStatus(
                request.getStatus());

        Double price = validatePrice(
                request.getPrice());

        List<Seat> seatsToSave = new ArrayList<>();

        for (int number = request.getStartNumber(); number <= request.getEndNumber(); number++) {
            String seatNumber = prefix + number;

            boolean exists = seatRepository
                    .existsByEventIdAndSeatNumberIgnoreCase(
                            request.getEventId(),
                            seatNumber);

            /*
             * Ghế đã tồn tại thì bỏ qua,
             * không làm cả request thất bại.
             */
            if (exists) {
                continue;
            }

            Seat seat = new Seat();

            seat.setEventId(
                    request.getEventId());

            seat.setSeatNumber(
                    seatNumber);

            seat.setSeatType(
                    seatType);

            seat.setStatus(
                    status);

            seat.setPrice(
                    price);

            seatsToSave.add(seat);
        }

        if (seatsToSave.isEmpty()) {
            return List.of();
        }

        try {
            return seatRepository.saveAll(
                    seatsToSave);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Some seat numbers already exist in this event");
        }
    }

    /*
     * =====================================================
     * CẬP NHẬT GHẾ
     * =====================================================
     */
    public Seat updateSeat(
            Long id,
            Seat request) {
        Seat seat = getSeatById(id);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Seat request is required");
        }

        applyAndValidateSeatData(
                seat,
                request,
                id);

        try {
            return seatRepository.save(
                    seat);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seat number already exists in this event");
        }
    }

    public Seat updateSeatStatus(
            Long id,
            String status) {
        Seat seat = getSeatById(id);

        seat.setStatus(
                normalizeStatus(status));

        return seatRepository.save(
                seat);
    }

    /*
     * =====================================================
     * XÓA GHẾ
     * =====================================================
     */
    public void deleteSeat(
            Long id) {
        Seat seat = getSeatById(id);

        String status = normalizeStatus(
                seat.getStatus());

        /*
         * Không xóa ghế đã giữ hoặc đã bán,
         * tránh làm sai dữ liệu Booking/Ticket.
         */
        if ("RESERVED".equals(status) ||
                "BOOKED".equals(status)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete RESERVED or BOOKED seat");
        }

        seatRepository.delete(seat);
    }

    /*
     * =====================================================
     * GIỮ GHẾ AN TOÀN
     * =====================================================
     */
    @Transactional
    public Seat reserveSeat(
            Long id,
            Long eventId) {
        validateEventId(eventId);

        int updated = seatRepository
                .reserveSeatIfAvailable(
                        id,
                        eventId);

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ghế đã có người khác giữ, đã được bán hoặc không thuộc sự kiện: "
                            + id);
        }

        return seatRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Seat not found: "
                                        + id));
    }

    /*
     * =====================================================
     * VALIDATE
     * =====================================================
     */
    private void applyAndValidateSeatData(
            Seat target,
            Seat request,
            Long currentSeatId) {
        validateEventId(
                request.getEventId());

        String seatNumber = normalizeSeatNumber(
                request.getSeatNumber());

        String seatType = normalizeSeatType(
                request.getSeatType());

        String status = normalizeStatus(
                request.getStatus());

        Double price = validatePrice(
                request.getPrice());

        boolean duplicate;

        if (currentSeatId == null) {
            duplicate = seatRepository
                    .existsByEventIdAndSeatNumberIgnoreCase(
                            request.getEventId(),
                            seatNumber);
        } else {
            duplicate = seatRepository
                    .existsByEventIdAndSeatNumberIgnoreCaseAndIdNot(
                            request.getEventId(),
                            seatNumber,
                            currentSeatId);
        }

        if (duplicate) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seat "
                            + seatNumber
                            + " already exists in event "
                            + request.getEventId());
        }

        target.setEventId(
                request.getEventId());

        target.setSeatNumber(
                seatNumber);

        target.setSeatType(
                seatType);

        target.setStatus(
                status);

        target.setPrice(
                price);
    }

    private void validateEventId(
            Long eventId) {
        if (eventId == null ||
                eventId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId must be greater than 0");
        }
    }

    private String normalizeSeatNumber(
            String seatNumber) {
        if (seatNumber == null ||
                seatNumber.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "seatNumber is required");
        }

        String normalized = seatNumber
                .trim()
                .toUpperCase();

        if (normalized.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "seatNumber cannot exceed 100 characters");
        }

        return normalized;
    }

    private String normalizeSeatType(
            String seatType) {
        String normalized = seatType == null ||
                seatType.isBlank()
                        ? "STANDARD"
                        : seatType
                                .trim()
                                .toUpperCase();

        if (!ALLOWED_SEAT_TYPES
                .contains(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid seat type: "
                            + seatType);
        }

        return normalized;
    }

    private String normalizeStatus(
            String status) {
        String normalized = status == null ||
                status.isBlank()
                        ? "AVAILABLE"
                        : status
                                .trim()
                                .toUpperCase();

        if (!ALLOWED_STATUSES
                .contains(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid seat status: "
                            + status);
        }

        return normalized;
    }

    private Double validatePrice(
            Double price) {
        if (price == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price is required");
        }

        if (price.isNaN() ||
                price.isInfinite() ||
                price < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price must be greater than or equal to 0");
        }

        return price;
    }
}