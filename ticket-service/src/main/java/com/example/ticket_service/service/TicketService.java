package com.example.ticket_service.service;

import com.example.ticket_service.dto.TicketCreateRequest;
import com.example.ticket_service.entity.Ticket;
import com.example.ticket_service.repository.TicketRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
    }

    public List<Ticket> getTicketsByEvent(Long eventId) {
        return ticketRepository.findByEventId(eventId);
    }

    public List<Ticket> getTicketsByBooking(Long bookingId) {
        return ticketRepository.findByBookingId(bookingId);
    }

    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository.findByUserId(userId);
    }

    public Ticket createTicket(Ticket ticket) {
        if (ticket.getTicketCode() == null || ticket.getTicketCode().isBlank()) {
            ticket.setTicketCode(generateTicketCode(ticket.getBookingId(), ticket.getSeatId()));
        }

        if (ticket.getStatus() == null || ticket.getStatus().isBlank()) {
            ticket.setStatus("VALID");
        }

        if (ticket.getIssuedAt() == null) {
            ticket.setIssuedAt(LocalDateTime.now());
        }

        String qrContent = buildQrContent(ticket);
        ticket.setQrContent(qrContent);
        ticket.setQrImage(generateQrImage(qrContent));

        return ticketRepository.save(ticket);
    }

    public Ticket issueTicket(TicketCreateRequest request) {
        validateIssueRequest(request);

        /*
         * Chống tạo vé trùng.
         * Nếu admin bấm PAID nhiều lần thì không tạo QR vé mới nữa.
         */
        return ticketRepository
                .findByBookingIdAndSeatId(request.getBookingId(), request.getSeatId())
                .orElseGet(() -> {
                    Ticket ticket = new Ticket();

                    ticket.setBookingId(request.getBookingId());
                    ticket.setUserId(request.getUserId());
                    ticket.setEventId(request.getEventId());
                    ticket.setSeatId(request.getSeatId());
                    ticket.setTicketType(request.getTicketType());
                    ticket.setPrice(request.getPrice());
                    ticket.setTicketCode(generateTicketCode(
                            request.getBookingId(),
                            request.getSeatId()
                    ));
                    ticket.setStatus("VALID");
                    ticket.setIssuedAt(LocalDateTime.now());

                    String qrContent = buildQrContent(ticket);
                    ticket.setQrContent(qrContent);
                    ticket.setQrImage(generateQrImage(qrContent));

                    return ticketRepository.save(ticket);
                });
    }

    public List<Ticket> issueTickets(List<TicketCreateRequest> requests) {
        List<Ticket> tickets = new ArrayList<>();

        for (TicketCreateRequest request : requests) {
            tickets.add(issueTicket(request));
        }

        return tickets;
    }

    public Ticket useTicket(Long id) {
        Ticket ticket = getTicketById(id);

        if (!"VALID".equalsIgnoreCase(ticket.getStatus())) {
            throw new RuntimeException("Ticket is not valid: " + id);
        }

        ticket.setStatus("USED");
        ticket.setUsedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    public Ticket useTicketByCode(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Ticket not found: " + ticketCode));

        if (!"VALID".equalsIgnoreCase(ticket.getStatus())) {
            throw new RuntimeException("Ticket is not valid: " + ticketCode);
        }

        ticket.setStatus("USED");
        ticket.setUsedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    public List<Ticket> cancelTicketsByBooking(Long bookingId) {
        List<Ticket> tickets = ticketRepository.findByBookingId(bookingId);

        for (Ticket ticket : tickets) {
            ticket.setStatus("CANCELLED");
        }

        return ticketRepository.saveAll(tickets);
    }

    public Ticket updateTicket(Long id, Ticket ticket) {
        Ticket oldTicket = getTicketById(id);

        oldTicket.setBookingId(ticket.getBookingId());
        oldTicket.setUserId(ticket.getUserId());
        oldTicket.setEventId(ticket.getEventId());
        oldTicket.setSeatId(ticket.getSeatId());
        oldTicket.setTicketType(ticket.getTicketType());
        oldTicket.setPrice(ticket.getPrice());
        oldTicket.setStatus(ticket.getStatus());

        String qrContent = buildQrContent(oldTicket);
        oldTicket.setQrContent(qrContent);
        oldTicket.setQrImage(generateQrImage(qrContent));

        return ticketRepository.save(oldTicket);
    }

    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }

    private void validateIssueRequest(TicketCreateRequest request) {
        if (request.getBookingId() == null) {
            throw new RuntimeException("bookingId is required");
        }

        if (request.getUserId() == null) {
            throw new RuntimeException("userId is required");
        }

        if (request.getEventId() == null) {
            throw new RuntimeException("eventId is required");
        }

        if (request.getSeatId() == null) {
            throw new RuntimeException("seatId is required");
        }

        if (request.getPrice() == null) {
            throw new RuntimeException("price is required");
        }
    }

    private String generateTicketCode(Long bookingId, Long seatId) {
        return "TICKET-" + bookingId + "-" + seatId + "-" + System.currentTimeMillis();
    }

    private String buildQrContent(Ticket ticket) {
        return "{"
                + "\"ticketCode\":\"" + ticket.getTicketCode() + "\","
                + "\"bookingId\":" + ticket.getBookingId() + ","
                + "\"userId\":" + ticket.getUserId() + ","
                + "\"eventId\":" + ticket.getEventId() + ","
                + "\"seatId\":" + ticket.getSeatId() + ","
                + "\"ticketType\":\"" + ticket.getTicketType() + "\","
                + "\"price\":" + ticket.getPrice()
                + "}";
    }

    private String generateQrImage(String content) {
        try {
            BitMatrix bitMatrix = new MultiFormatWriter()
                    .encode(content, BarcodeFormat.QR_CODE, 300, 300);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());

            return "data:image/png;base64," + base64;
        } catch (Exception e) {
            throw new RuntimeException("Cannot generate QR image");
        }
    }
}