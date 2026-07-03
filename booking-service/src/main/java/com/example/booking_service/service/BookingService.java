package com.example.booking_service.service;

import com.example.booking_service.dto.*;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingItem;
import com.example.booking_service.event.BookingCreatedEvent;
import com.example.booking_service.event.BookingEventProducer;
import com.example.booking_service.feign.EventClient;
import com.example.booking_service.feign.SeatClient;
import com.example.booking_service.feign.UserClient;
import com.example.booking_service.repository.BookingItemRepository;
import com.example.booking_service.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.example.booking_service.feign.TicketClient;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingItemRepository bookingItemRepository;

    private final UserClient userClient;
    private final EventClient eventClient;
    private final SeatClient seatClient;
    private final TicketClient ticketClient;
    private final BookingEventProducer bookingEventProducer;

    public List<Booking> getAllBookings(String role) {
        if (!isAdmin(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ADMIN role required");
        }

        return bookingRepository.findAll();
    }

    public List<Booking> getBookingsByUser(Long userId, Long currentUserId, String role) {
        checkOwnerOrAdmin(userId, currentUserId, role);
        return bookingRepository.findByUserId(userId);
    }

    public Booking getBookingById(Long id, Long currentUserId, String role) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking not found: " + id
                ));

        checkOwnerOrAdmin(booking.getUserId(), currentUserId, role);

        return booking;
    }

    public BookingDetailResponse getBookingDetail(Long bookingId, Long currentUserId, String role) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking not found: " + bookingId
                ));

        checkOwnerOrAdmin(booking.getUserId(), currentUserId, role);

        List<BookingItem> items = bookingItemRepository.findByBookingId(bookingId);

        return new BookingDetailResponse(booking, items);
    }

    public Booking createBooking(BookingRequest request, Long currentUserId, String role) {
        if (request.getUserId() == null && currentUserId != null) {
            request.setUserId(currentUserId);
        }

        if (!isAdmin(role)) {
            if (currentUserId == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user token");
            }

            if (request.getUserId() == null || !request.getUserId().equals(currentUserId)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You can only create booking for yourself"
                );
            }
        }

        if (request.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }

        if (request.getEventId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventId is required");
        }

        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds is required");
        }

        UserDTO user;
        try {
            user = userClient.getUserById(request.getUserId());
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot get user: " + request.getUserId()
            );
        }

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found");
        }

        EventDTO event;
        try {
            event = eventClient.getEventById(request.getEventId());
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot get event: " + request.getEventId()
            );
        }

        if (event == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event not found");
        }

        double totalAmount = 0;
        List<SeatDTO> seatList = new ArrayList<>();

        for (Long seatId : request.getSeatIds()) {
            SeatDTO seat;

            try {
                seat = seatClient.getSeatById(seatId);
            } catch (Exception e) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Cannot get seat: " + seatId
                );
            }

            if (seat == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seat not found: " + seatId
                );
            }

            if (!request.getEventId().equals(seat.getEventId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seat " + seatId + " does not belong to event " + request.getEventId()
                );
            }

            if (seat.getStatus() == null ||
                    !"AVAILABLE".equalsIgnoreCase(seat.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seat not available: " + seatId
                );
            }

            if (seat.getPrice() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seat price is null: " + seatId
                );
            }

            totalAmount += seat.getPrice();
            seatList.add(seat);
        }

        Booking booking = new Booking();
        booking.setUserId(request.getUserId());
        booking.setEventId(request.getEventId());
        booking.setBookingCode("BK-" + System.currentTimeMillis());
        booking.setTotalAmount(totalAmount);
        booking.setStatus("PENDING");
        booking.setBookingDate(LocalDateTime.now());

        booking = bookingRepository.save(booking);

        for (SeatDTO seat : seatList) {
            BookingItem item = new BookingItem();
            item.setBookingId(booking.getId());
            item.setSeatId(seat.getId());
            item.setPrice(seat.getPrice());

            bookingItemRepository.save(item);

            /*
             * Đúng luồng:
             * Tạo booking xong chỉ giữ ghế, chưa phải đã bán.
             */
            seatClient.updateSeatStatus(seat.getId(), "RESERVED");
        }

        try {
            BookingCreatedEvent bookingCreatedEvent = new BookingCreatedEvent();
            bookingCreatedEvent.setBookingId(booking.getId());
            bookingCreatedEvent.setUserId(booking.getUserId());
            bookingCreatedEvent.setBookingCode(booking.getBookingCode());
            bookingCreatedEvent.setTotalAmount(booking.getTotalAmount());
            bookingCreatedEvent.setMessage("Booking created: " + booking.getBookingCode());

            bookingEventProducer.sendBookingCreatedEvent(bookingCreatedEvent);
        } catch (Exception e) {
            System.out.println("RabbitMQ event failed but booking continues");
        }

        return booking;
    }

    public Booking updateBookingStatus(Long id, String status, String role) {
        if (!isAdmin(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ADMIN role required");
        }

        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking not found: " + id
                ));

        if (status == null || status.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }

        String newStatus = status.trim().toUpperCase();

        if (!List.of("PENDING", "PAID", "CANCELLED", "EXPIRED").contains(newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid booking status: " + status
            );
        }

        List<BookingItem> items = bookingItemRepository.findByBookingId(id);

        if ("PAID".equals(newStatus)) {
            for (BookingItem item : items) {
                seatClient.updateSeatStatus(item.getSeatId(), "BOOKED");
        
                SeatDTO seat = seatClient.getSeatById(item.getSeatId());
        
                TicketCreateRequest ticketRequest = new TicketCreateRequest();
                ticketRequest.setBookingId(booking.getId());
                ticketRequest.setUserId(booking.getUserId());
                ticketRequest.setEventId(booking.getEventId());
                ticketRequest.setSeatId(item.getSeatId());
                ticketRequest.setPrice(item.getPrice());
        
                if (seat != null && seat.getSeatType() != null) {
                    ticketRequest.setTicketType(seat.getSeatType());
                } else {
                    ticketRequest.setTicketType("STANDARD");
                }
        
                ticketClient.issueTicket(ticketRequest);
            }
        }

        if ("CANCELLED".equals(newStatus) || "EXPIRED".equals(newStatus)) {
            for (BookingItem item : items) {
                seatClient.updateSeatStatus(item.getSeatId(), "AVAILABLE");
            }
        
            try {
                ticketClient.cancelTicketsByBooking(id);
            } catch (Exception e) {
                System.out.println("Cancel tickets failed but booking status continues");
            }
        }

        if ("PENDING".equals(newStatus)) {
            for (BookingItem item : items) {
                seatClient.updateSeatStatus(item.getSeatId(), "RESERVED");
            }
        }

        booking.setStatus(newStatus);

        return bookingRepository.save(booking);
    }

    public Booking cancelBooking(Long id, Long currentUserId, String role) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking not found: " + id
                ));

        checkOwnerOrAdmin(booking.getUserId(), currentUserId, role);

        if ("PAID".equalsIgnoreCase(booking.getStatus()) && !isAdmin(role)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Paid booking cannot be cancelled by user"
            );
        }

        List<BookingItem> items = bookingItemRepository.findByBookingId(id);

        for (BookingItem item : items) {
            seatClient.updateSeatStatus(item.getSeatId(), "AVAILABLE");
        }

        booking.setStatus("CANCELLED");

        return bookingRepository.save(booking);
    }

    public void deleteBooking(Long id, Long currentUserId, String role) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking not found: " + id
                ));

        checkOwnerOrAdmin(booking.getUserId(), currentUserId, role);

        List<BookingItem> items = bookingItemRepository.findByBookingId(id);

        for (BookingItem item : items) {
            if (!"PAID".equalsIgnoreCase(booking.getStatus())) {
                seatClient.updateSeatStatus(item.getSeatId(), "AVAILABLE");
            }
        }

        bookingItemRepository.deleteAll(items);
        bookingRepository.deleteById(id);
    }

    private void checkOwnerOrAdmin(Long ownerUserId, Long currentUserId, String role) {
        if (isAdmin(role)) {
            return;
        }

        if (currentUserId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user token");
        }

        if (!ownerUserId.equals(currentUserId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not allowed to access this booking"
            );
        }
    }

    private boolean isAdmin(String role) {
        return role != null && role.equalsIgnoreCase("ADMIN");
    }
}