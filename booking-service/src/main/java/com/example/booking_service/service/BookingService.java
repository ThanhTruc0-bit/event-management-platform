package com.example.booking_service.service;

import com.example.booking_service.dto.*;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.event.BookingCreatedEvent;
import com.example.booking_service.event.BookingEventProducer;
import com.example.booking_service.feign.EventClient;
import com.example.booking_service.feign.SeatClient;
import com.example.booking_service.feign.TicketClient;
import com.example.booking_service.feign.UserClient;
import com.example.booking_service.repository.BookingItemRepository;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.specification.BookingSpecification;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

        private static final int MAX_TICKETS_PER_USER_PER_EVENT = 4;

        private static final int BOOKING_HOLD_MINUTES = 15;

        private static final Set<String> ALLOWED_BOOKING_STATUSES = Set.of(
                        "PENDING",
                        "PAID",
                        "CANCELLED",
                        "EXPIRED",
                        "FAILED");

        private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
                        "id",
                        "bookingCode",
                        "userId",
                        "eventId",
                        "totalAmount",
                        "status",
                        "bookingDate",
                        "expiresAt",
                        "paidAt",
                        "cancelledAt");

        private final BookingRepository bookingRepository;

        private final BookingItemRepository bookingItemRepository;

        private final UserClient userClient;

        private final EventClient eventClient;

        private final SeatClient seatClient;

        private final TicketClient ticketClient;

        private final BookingEventProducer bookingEventProducer;

        public Page<Booking> searchBookings(
                        int page,
                        int size,
                        String keyword,
                        String status,
                        Long userId,
                        Long eventId,
                        Double minAmount,
                        Double maxAmount,
                        LocalDateTime fromDate,
                        LocalDateTime toDate,
                        String sortBy,
                        String sortDirection,
                        String role) {
                requireAdmin(role);
                validatePage(page, size);

                validateAmountRange(
                                minAmount,
                                maxAmount);

                Pageable pageable = PageRequest.of(
                                page,
                                size,
                                createSort(
                                                sortBy,
                                                sortDirection));

                return bookingRepository.findAll(
                                BookingSpecification.filter(
                                                keyword,
                                                normalizeOptionalStatus(
                                                                status),
                                                userId,
                                                eventId,
                                                minAmount,
                                                maxAmount,
                                                fromDate,
                                                toDate),
                                pageable);
        }

        public Page<Booking> searchBookingsByUser(
                        Long userId,
                        int page,
                        int size,
                        String keyword,
                        String status,
                        Long eventId,
                        String sortBy,
                        String sortDirection,
                        Long currentUserId,
                        String role) {
                checkOwnerOrAdmin(
                                userId,
                                currentUserId,
                                role);

                validatePage(
                                page,
                                size);

                Pageable pageable = PageRequest.of(
                                page,
                                size,
                                createSort(
                                                sortBy,
                                                sortDirection));

                return bookingRepository.findAll(
                                BookingSpecification.filter(
                                                keyword,
                                                normalizeOptionalStatus(
                                                                status),
                                                userId,
                                                eventId,
                                                null,
                                                null,
                                                null,
                                                null),
                                pageable);
        }

        public Booking getBookingById(
                        Long id,
                        Long currentUserId,
                        String role) {
                Booking booking = findBookingById(id);

                checkOwnerOrAdmin(
                                booking.getUserId(),
                                currentUserId,
                                role);

                return booking;
        }

        public BookingDetailResponse getBookingDetail(
                        Long bookingId,
                        Long currentUserId,
                        String role) {
                Booking booking = findBookingById(
                                bookingId);

                checkOwnerOrAdmin(
                                booking.getUserId(),
                                currentUserId,
                                role);

                List<BookingItem> items = bookingItemRepository
                                .findByBookingIdOrderByIdAsc(
                                                bookingId);

                return new BookingDetailResponse(
                                booking,
                                items);
        }

        @Transactional
        public Booking createBooking(
                        BookingRequest request,
                        Long currentUserId,
                        String role) {
                validateBookingRequest(
                                request,
                                currentUserId,
                                role);

                Long userId = request.getUserId();

                Long eventId = request.getEventId();

                validateTicketLimit(
                                userId,
                                eventId,
                                request.getSeatIds());

                getUserFromService(userId);
                getEventFromService(eventId);

                List<SeatDTO> seats = validateAndLoadSeats(
                                request.getSeatIds(),
                                eventId);

                double totalAmount = seats.stream()
                                .map(
                                                SeatDTO::getPrice)
                                .filter(
                                                Objects::nonNull)
                                .mapToDouble(
                                                Double::doubleValue)
                                .sum();

                List<Long> reservedSeatIds = new ArrayList<>();

                try {
                        /*
                         * Seat Service phải chống tranh ghế:
                         * chỉ AVAILABLE mới chuyển RESERVED.
                         */
                        for (SeatDTO seat : seats) {
                                reserveSeat(
                                                seat.getId(),
                                                eventId);

                                reservedSeatIds.add(
                                                seat.getId());
                        }

                        LocalDateTime now = LocalDateTime.now();

                        Booking booking = new Booking();

                        booking.setUserId(
                                        userId);

                        booking.setEventId(
                                        eventId);

                        booking.setBookingCode(
                                        generateBookingCode());

                        booking.setTotalAmount(
                                        totalAmount);

                        booking.setStatus(
                                        "PENDING");

                        booking.setBookingDate(
                                        now);

                        booking.setExpiresAt(
                                        now.plusMinutes(
                                                        BOOKING_HOLD_MINUTES));

                        Booking savedBooking = bookingRepository.save(
                                        booking);

                        List<BookingItem> items = new ArrayList<>();

                        for (SeatDTO seat : seats) {
                                BookingItem item = new BookingItem();

                                item.setBookingId(
                                                savedBooking.getId());

                                item.setSeatId(
                                                seat.getId());

                                item.setPrice(
                                                seat.getPrice());

                                items.add(item);
                        }

                        bookingItemRepository
                                        .saveAll(items);

                        sendBookingCreatedEvent(
                                        savedBooking);

                        return savedBooking;
                } catch (ResponseStatusException exception) {
                        rollbackReservedSeats(
                                        reservedSeatIds);

                        throw exception;
                } catch (FeignException exception) {
                        rollbackReservedSeats(
                                        reservedSeatIds);

                        if (exception.status() == 400
                                        || exception.status() == 409) {
                                throw new ResponseStatusException(
                                                HttpStatus.CONFLICT,
                                                "Có ghế vừa được người khác giữ. Vui lòng chọn ghế khác.");
                        }

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Seat Service is unavailable");
                } catch (Exception exception) {
                        rollbackReservedSeats(
                                        reservedSeatIds);

                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Cannot create booking");
                }
        }

        @Transactional
        public Booking updateBookingStatus(
                        Long id,
                        String status,
                        String role) {
                requireAdmin(role);

                Booking booking = findBookingById(id);

                String currentStatus = normalizeStatus(
                                booking.getStatus());

                String newStatus = normalizeRequiredStatus(
                                status);

                /*
                 * Callback có thể gọi lại.
                 * Nếu cùng trạng thái thì trả về luôn,
                 * không tạo ticket trùng.
                 */
                if (currentStatus.equals(
                                newStatus)) {
                        return booking;
                }

                if ("PAID".equals(
                                currentStatus)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "PAID booking cannot change to "
                                                        + newStatus);
                }

                List<BookingItem> items = bookingItemRepository
                                .findByBookingIdOrderByIdAsc(
                                                id);

                if ("PAID".equals(
                                newStatus)) {
                        if (booking.getExpiresAt() != null
                                        && booking
                                                        .getExpiresAt()
                                                        .isBefore(
                                                                        LocalDateTime.now())) {
                                throw new ResponseStatusException(
                                                HttpStatus.CONFLICT,
                                                "Booking has expired");
                        }

                        try {
                                markSeatsBooked(items);

                                issueTickets(
                                                booking,
                                                items);
                        } catch (Exception exception) {
                                /*
                                 * Cố gắng đưa ghế lại RESERVED
                                 * nếu Ticket Service lỗi.
                                 */
                                reserveBookingSeats(
                                                items);

                                throw new ResponseStatusException(
                                                HttpStatus.SERVICE_UNAVAILABLE,
                                                "Cannot complete booking because Ticket or Seat Service is unavailable");
                        }

                        booking.setPaidAt(
                                        LocalDateTime.now());
                } else if ("CANCELLED".equals(newStatus)
                                || "EXPIRED".equals(newStatus)
                                || "FAILED".equals(newStatus)) {
                        releaseSeats(items);

                        if ("CANCELLED".equals(
                                        newStatus)) {
                                booking.setCancelledAt(
                                                LocalDateTime.now());
                        }
                } else if ("PENDING".equals(newStatus)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Cannot manually return booking to PENDING");
                }

                booking.setStatus(
                                newStatus);

                return bookingRepository.save(
                                booking);
        }

        @Transactional
        public Booking cancelBooking(
                        Long id,
                        Long currentUserId,
                        String role) {
                Booking booking = findBookingById(id);

                checkOwnerOrAdmin(
                                booking.getUserId(),
                                currentUserId,
                                role);

                String status = normalizeStatus(
                                booking.getStatus());

                if ("CANCELLED".equals(status)
                                || "EXPIRED".equals(status)) {
                        return booking;
                }

                /*
                 * Không hủy booking PAID
                 * khi chưa có hoàn tiền.
                 */
                if ("PAID".equals(status)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Booking đã thanh toán không thể hủy khi chưa có quy trình hoàn tiền.");
                }

                List<BookingItem> items = bookingItemRepository
                                .findByBookingIdOrderByIdAsc(
                                                id);

                releaseSeats(items);

                booking.setStatus(
                                "CANCELLED");

                booking.setCancelledAt(
                                LocalDateTime.now());

                return bookingRepository.save(
                                booking);
        }

        @Transactional
        public void deleteBooking(
                        Long id,
                        String role) {
                requireAdmin(role);

                Booking booking = findBookingById(id);

                String status = normalizeStatus(
                                booking.getStatus());

                /*
                 * Kể cả ADMIN cũng không được
                 * xóa booking PAID.
                 */
                if ("PAID".equals(status)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Không được xóa booking đã thanh toán.");
                }

                List<BookingItem> items = bookingItemRepository
                                .findByBookingIdOrderByIdAsc(
                                                id);

                releaseSeats(items);

                bookingItemRepository
                                .deleteAll(items);

                bookingRepository.delete(
                                booking);
        }

        /*
         * Scheduler gọi mỗi phút.
         */
        @Transactional
        public int expirePendingBookings() {
                List<Booking> expiredBookings = bookingRepository
                                .findByStatusIgnoreCaseAndExpiresAtBefore(
                                                "PENDING",
                                                LocalDateTime.now());

                int expiredCount = 0;

                for (Booking booking : expiredBookings) {
                        try {
                                List<BookingItem> items = bookingItemRepository
                                                .findByBookingIdOrderByIdAsc(
                                                                booking.getId());

                                releaseSeats(items);

                                booking.setStatus(
                                                "EXPIRED");

                                bookingRepository.save(
                                                booking);

                                expiredCount++;
                        } catch (Exception exception) {
                                /*
                                 * Không dừng toàn bộ scheduler
                                 * vì một booking lỗi.
                                 */
                                exception.printStackTrace();
                        }
                }

                return expiredCount;
        }

        private void validateBookingRequest(
                        BookingRequest request,
                        Long currentUserId,
                        String role) {
                if (request == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Booking request is required");
                }

                if (request.getUserId() == null
                                && currentUserId != null) {
                        request.setUserId(
                                        currentUserId);
                }

                if (!isAdmin(role)) {
                        if (currentUserId == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Missing user token");
                        }

                        if (!currentUserId.equals(
                                        request.getUserId())) {
                                throw new ResponseStatusException(
                                                HttpStatus.FORBIDDEN,
                                                "You can only create booking for yourself");
                        }
                }

                if (request.getUserId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "userId is required");
                }

                if (request.getEventId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "eventId is required");
                }

                if (request.getSeatIds() == null
                                || request
                                                .getSeatIds()
                                                .isEmpty()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "seatIds is required");
                }

                if (request
                                .getSeatIds()
                                .stream()
                                .anyMatch(
                                                Objects::isNull)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "seatIds cannot contain null");
                }

                Set<Long> distinctSeatIds = new HashSet<>(
                                request.getSeatIds());

                if (distinctSeatIds.size() != request
                                .getSeatIds()
                                .size()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Danh sách ghế bị trùng.");
                }

                if (request
                                .getSeatIds()
                                .size() > MAX_TICKETS_PER_USER_PER_EVENT) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mỗi tài khoản chỉ được mua tối đa 4 vé cho một sự kiện.");
                }
        }

        private void validateTicketLimit(
                        Long userId,
                        Long eventId,
                        List<Long> seatIds) {
                long existingTicketCount = bookingRepository
                                .countActiveTicketsByUserIdAndEventId(
                                                userId,
                                                eventId);

                if (existingTicketCount
                                + seatIds.size() > MAX_TICKETS_PER_USER_PER_EVENT) {
                        long remaining = Math.max(
                                        0,
                                        MAX_TICKETS_PER_USER_PER_EVENT
                                                        - existingTicketCount);

                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Bạn đã có "
                                                        + existingTicketCount
                                                        + " vé và chỉ có thể mua thêm "
                                                        + remaining
                                                        + " vé.");
                }
        }

        private List<SeatDTO> validateAndLoadSeats(
                        List<Long> seatIds,
                        Long eventId) {
                List<SeatDTO> result = new ArrayList<>();

                for (Long seatId : seatIds) {
                        SeatDTO seat = getSeatFromService(
                                        seatId);

                        if (seat.getEventId() == null
                                        || !eventId.equals(
                                                        seat.getEventId())) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Seat "
                                                                + seatId
                                                                + " does not belong to event "
                                                                + eventId);
                        }

                        if (!"AVAILABLE"
                                        .equalsIgnoreCase(
                                                        seat.getStatus())) {
                                throw new ResponseStatusException(
                                                HttpStatus.CONFLICT,
                                                "Seat not available: "
                                                                + seatId);
                        }

                        if (seat.getPrice() == null
                                        || seat.getPrice() < 0) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Invalid seat price: "
                                                                + seatId);
                        }

                        result.add(seat);
                }

                return result;
        }

        private UserDTO getUserFromService(
                        Long id) {
                try {
                        UserDTO user = userClient.getUserById(
                                        id);

                        if (user == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "User not found: "
                                                                + id);
                        }

                        return user;
                } catch (ResponseStatusException exception) {
                        throw exception;
                } catch (FeignException.NotFound exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "User not found: "
                                                        + id);
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "User Service is unavailable");
                }
        }

        private EventDTO getEventFromService(
                        Long id) {
                try {
                        EventDTO event = eventClient.getEventById(
                                        id);

                        if (event == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Event not found: "
                                                                + id);
                        }

                        return event;
                } catch (ResponseStatusException exception) {
                        throw exception;
                } catch (FeignException.NotFound exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found: "
                                                        + id);
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Event Service is unavailable");
                }
        }

        private SeatDTO getSeatFromService(
                        Long id) {
                try {
                        SeatDTO seat = seatClient.getSeatById(
                                        id);

                        if (seat == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Seat not found: "
                                                                + id);
                        }

                        return seat;
                } catch (ResponseStatusException exception) {
                        throw exception;
                } catch (FeignException.NotFound exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Seat not found: "
                                                        + id);
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Seat Service is unavailable");
                }
        }

        private void reserveSeat(
                        Long seatId,
                        Long eventId) {
                try {
                        seatClient.reserveSeat(
                                        seatId,
                                        eventId);
                } catch (FeignException exception) {
                        if (exception.status() == 400
                                        || exception.status() == 409) {
                                throw new ResponseStatusException(
                                                HttpStatus.CONFLICT,
                                                "Seat has already been reserved: "
                                                                + seatId);
                        }

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Seat Service is unavailable");
                }
        }

        private void markSeatsBooked(
                        List<BookingItem> items) {
                for (BookingItem item : items) {
                        seatClient.updateSeatStatus(
                                        item.getSeatId(),
                                        "BOOKED");
                }
        }

        private void reserveBookingSeats(
                        List<BookingItem> items) {
                for (BookingItem item : items) {
                        try {
                                seatClient.updateSeatStatus(
                                                item.getSeatId(),
                                                "RESERVED");
                        } catch (Exception ignored) {
                        }
                }
        }

        private void releaseSeats(
                        List<BookingItem> items) {
                for (BookingItem item : items) {
                        try {
                                seatClient.updateSeatStatus(
                                                item.getSeatId(),
                                                "AVAILABLE");
                        } catch (Exception exception) {
                                throw new ResponseStatusException(
                                                HttpStatus.SERVICE_UNAVAILABLE,
                                                "Cannot release seat: "
                                                                + item.getSeatId());
                        }
                }
        }

        private void rollbackReservedSeats(
                        List<Long> seatIds) {
                for (Long seatId : seatIds) {
                        try {
                                seatClient.updateSeatStatus(
                                                seatId,
                                                "AVAILABLE");
                        } catch (Exception ignored) {
                        }
                }
        }

        private void issueTickets(
                        Booking booking,
                        List<BookingItem> items) {
                for (BookingItem item : items) {
                        SeatDTO seat = getSeatFromService(
                                        item.getSeatId());

                        TicketCreateRequest request = new TicketCreateRequest();

                        request.setBookingId(
                                        booking.getId());

                        request.setUserId(
                                        booking.getUserId());

                        request.setEventId(
                                        booking.getEventId());

                        request.setSeatId(
                                        item.getSeatId());

                        request.setTicketType(
                                        seat.getSeatType() == null
                                                        ? "STANDARD"
                                                        : seat.getSeatType());

                        request.setPrice(
                                        item.getPrice());

                        ticketClient.issueTicket(
                                        request);
                }
        }

        private void sendBookingCreatedEvent(
                        Booking booking) {
                try {
                        BookingCreatedEvent event = new BookingCreatedEvent(
                                        booking.getId(),
                                        booking.getUserId(),
                                        booking.getBookingCode(),
                                        booking.getTotalAmount(),
                                        "Booking created successfully");

                        bookingEventProducer
                                        .sendBookingCreatedEvent(
                                                        event);
                } catch (Exception exception) {
                        /*
                         * RabbitMQ lỗi không làm mất
                         * booking vừa tạo.
                         */
                        exception.printStackTrace();
                }
        }

        private Booking findBookingById(
                        Long id) {
                return bookingRepository
                                .findById(id)
                                .orElseThrow(
                                                () -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Booking not found: "
                                                                                + id));
        }

        private String generateBookingCode() {
                String code;

                do {
                        code = "BK-"
                                        + UUID
                                                        .randomUUID()
                                                        .toString()
                                                        .replace("-", "")
                                                        .substring(0, 12)
                                                        .toUpperCase();
                } while (bookingRepository
                                .existsByBookingCode(
                                                code));

                return code;
        }

        private void checkOwnerOrAdmin(
                        Long ownerUserId,
                        Long currentUserId,
                        String role) {
                if (isAdmin(role)) {
                        return;
                }

                if (currentUserId == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Missing user token");
                }

                if (!ownerUserId.equals(
                                currentUserId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "You cannot access another user's booking");
                }
        }

        private void requireAdmin(
                        String role) {
                if (!isAdmin(role)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "ADMIN role is required");
                }
        }

        private boolean isAdmin(
                        String role) {
                if (role == null) {
                        return false;
                }

                String normalized = role
                                .trim()
                                .toUpperCase();

                return "ADMIN".equals(
                                normalized)
                                || "ROLE_ADMIN".equals(
                                                normalized);
        }

        private String normalizeOptionalStatus(
                        String status) {
                if (status == null
                                || status.isBlank()
                                || "ALL".equalsIgnoreCase(
                                                status)) {
                        return null;
                }

                return normalizeRequiredStatus(
                                status);
        }

        private String normalizeRequiredStatus(
                        String status) {
                if (status == null
                                || status.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "status is required");
                }

                String normalized = status
                                .trim()
                                .toUpperCase();

                if (!ALLOWED_BOOKING_STATUSES
                                .contains(normalized)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid booking status: "
                                                        + status);
                }

                return normalized;
        }

        private String normalizeStatus(
                        String status) {
                return status == null
                                ? ""
                                : status
                                                .trim()
                                                .toUpperCase();
        }

        private void validatePage(
                        int page,
                        int size) {
                if (page < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "page must be greater than or equal to 0");
                }

                if (size < 1
                                || size > 100) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "size must be between 1 and 100");
                }
        }

        private void validateAmountRange(
                        Double minAmount,
                        Double maxAmount) {
                if (minAmount != null
                                && minAmount < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "minAmount cannot be negative");
                }

                if (maxAmount != null
                                && maxAmount < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "maxAmount cannot be negative");
                }

                if (minAmount != null
                                && maxAmount != null
                                && minAmount > maxAmount) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "minAmount must be less than or equal to maxAmount");
                }
        }

        private Sort createSort(
                        String sortBy,
                        String sortDirection) {
                String field = ALLOWED_SORT_FIELDS
                                .contains(sortBy)
                                                ? sortBy
                                                : "bookingDate";

                Sort.Direction direction = "asc".equalsIgnoreCase(
                                sortDirection)
                                                ? Sort.Direction.ASC
                                                : Sort.Direction.DESC;

                return Sort.by(
                                direction,
                                field);
        }
}