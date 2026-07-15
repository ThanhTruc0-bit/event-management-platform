package com.example.ticket_service.service;

import com.example.ticket_service.dto.TicketCreateRequest;
import com.example.ticket_service.entity.Ticket;
import com.example.ticket_service.repository.TicketRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "ticketCode",
            "bookingId",
            "userId",
            "eventId",
            "seatId",
            "ticketType",
            "price",
            "status",
            "issuedAt",
            "usedAt"
    );

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "VALID",
            "ACTIVE",
            "PAID",
            "USED",
            "CHECKED_IN",
            "CANCELLED",
            "EXPIRED",
            "FAILED"
    );

    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public Page<Ticket> searchTickets(
            String keyword,
            String status,
            Long userId,
            Long eventId,
            Long bookingId,
            String ticketType,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String safeSortBy = normalizeSortField(sortBy);

        Sort.Direction direction =
                "asc".equalsIgnoreCase(sortDirection)
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        PageRequest pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(direction, safeSortBy)
        );

        Specification<Ticket> specification =
                (root, query, criteriaBuilder) -> {

                    List<Predicate> predicates = new ArrayList<>();

                    if (keyword != null && !keyword.isBlank()) {
                        String trimmedKeyword = keyword.trim();

                        String likeKeyword =
                                "%"
                                        + trimmedKeyword
                                        .toLowerCase(Locale.ROOT)
                                        + "%";

                        List<Predicate> keywordPredicates =
                                new ArrayList<>();

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.get("ticketCode")
                                        ),
                                        likeKeyword
                                )
                        );

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.get("ticketType")
                                        ),
                                        likeKeyword
                                )
                        );

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.get("status")
                                        ),
                                        likeKeyword
                                )
                        );

                        try {
                            Long numericKeyword =
                                    Long.valueOf(trimmedKeyword);

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("id"),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("bookingId"),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("userId"),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("eventId"),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("seatId"),
                                            numericKeyword
                                    )
                            );
                        } catch (NumberFormatException ignored) {
                            // Keyword không phải số.
                        }

                        predicates.add(
                                criteriaBuilder.or(
                                        keywordPredicates.toArray(
                                                new Predicate[0]
                                        )
                                )
                        );
                    }

                    List<String> statusValues =
                            parseStatuses(status);

                    if (!statusValues.isEmpty()) {
                        predicates.add(
                                criteriaBuilder
                                        .upper(root.get("status"))
                                        .in(statusValues)
                        );
                    }

                    if (userId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("userId"),
                                        userId
                                )
                        );
                    }

                    if (eventId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("eventId"),
                                        eventId
                                )
                        );
                    }

                    if (bookingId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("bookingId"),
                                        bookingId
                                )
                        );
                    }

                    if (ticketType != null
                            && !ticketType.isBlank()) {

                        predicates.add(
                                criteriaBuilder.equal(
                                        criteriaBuilder.upper(
                                                root.get("ticketType")
                                        ),
                                        ticketType.trim()
                                                .toUpperCase(Locale.ROOT)
                                )
                        );
                    }

                    return criteriaBuilder.and(
                            predicates.toArray(
                                    new Predicate[0]
                            )
                    );
                };

        return ticketRepository.findAll(
                specification,
                pageable
        );
    }

    @Transactional(readOnly = true)
    public Page<Ticket> searchTicketsByUser(
            Long userId,
            String keyword,
            String status,
            String ticketType,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        return searchTickets(
                keyword,
                status,
                userId,
                null,
                null,
                ticketType,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    @Transactional(readOnly = true)
    public Page<Ticket> searchTicketsByBooking(
            Long bookingId,
            String keyword,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        return searchTickets(
                keyword,
                status,
                null,
                null,
                bookingId,
                null,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    @Transactional(readOnly = true)
    public Page<Ticket> searchTicketsByEvent(
            Long eventId,
            String keyword,
            String status,
            String ticketType,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        return searchTickets(
                keyword,
                status,
                null,
                eventId,
                null,
                ticketType,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    @Transactional(readOnly = true)
    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ticket not found: " + id
                ));
    }

    @Transactional(readOnly = true)
    public Ticket getTicketByCode(String ticketCode) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ticketCode is required"
            );
        }

        return ticketRepository
                .findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ticket not found: " + ticketCode
                ));
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByEvent(Long eventId) {
        return ticketRepository
                .findByEventIdOrderByIssuedAtDesc(eventId);
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByBooking(Long bookingId) {
        return ticketRepository
                .findByBookingIdOrderByIssuedAtDesc(bookingId);
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository
                .findByUserIdOrderByIssuedAtDesc(userId);
    }

    @Transactional
    public Ticket createTicket(Ticket ticket) {
        if (ticket == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket request is required"
            );
        }

        validateTicketFields(ticket);

        ticketRepository
                .findByBookingIdAndSeatId(
                        ticket.getBookingId(),
                        ticket.getSeatId()
                )
                .ifPresent(existing -> {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Ticket already exists for booking "
                                    + ticket.getBookingId()
                                    + " and seat "
                                    + ticket.getSeatId()
                    );
                });

        if (ticket.getTicketCode() == null
                || ticket.getTicketCode().isBlank()) {

            ticket.setTicketCode(
                    generateUniqueTicketCode()
            );
        } else {
            String ticketCode =
                    ticket.getTicketCode().trim();

            if (ticketRepository.existsByTicketCode(ticketCode)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket code already exists: " + ticketCode
                );
            }

            ticket.setTicketCode(ticketCode);
        }

        if (ticket.getTicketType() == null
                || ticket.getTicketType().isBlank()) {

            ticket.setTicketType("STANDARD");
        } else {
            ticket.setTicketType(
                    ticket.getTicketType()
                            .trim()
                            .toUpperCase(Locale.ROOT)
            );
        }

        if (ticket.getStatus() == null
                || ticket.getStatus().isBlank()) {

            ticket.setStatus("VALID");
        } else {
            ticket.setStatus(
                    normalizeAndValidateStatus(
                            ticket.getStatus()
                    )
            );
        }

        if (ticket.getIssuedAt() == null) {
            ticket.setIssuedAt(LocalDateTime.now());
        }

        refreshQrData(ticket);

        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket issueTicket(TicketCreateRequest request) {
        validateIssueRequest(request);

        return ticketRepository
                .findByBookingIdAndSeatId(
                        request.getBookingId(),
                        request.getSeatId()
                )
                .orElseGet(() -> {
                    Ticket ticket = new Ticket();

                    ticket.setBookingId(request.getBookingId());
                    ticket.setUserId(request.getUserId());
                    ticket.setEventId(request.getEventId());
                    ticket.setSeatId(request.getSeatId());

                    ticket.setTicketType(
                            request.getTicketType() == null
                                    || request.getTicketType().isBlank()
                                    ? "STANDARD"
                                    : request.getTicketType()
                                    .trim()
                                    .toUpperCase(Locale.ROOT)
                    );

                    ticket.setPrice(request.getPrice());
                    ticket.setTicketCode(
                            generateUniqueTicketCode()
                    );
                    ticket.setStatus("VALID");
                    ticket.setIssuedAt(LocalDateTime.now());

                    refreshQrData(ticket);

                    return ticketRepository.save(ticket);
                });
    }

    @Transactional
    public List<Ticket> issueTickets(
            List<TicketCreateRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket requests are required"
            );
        }

        List<Ticket> tickets = new ArrayList<>();

        for (TicketCreateRequest request : requests) {
            tickets.add(issueTicket(request));
        }

        return tickets;
    }

    @Transactional
    public Ticket useTicket(Long id) {
        Ticket ticket = getTicketById(id);

        validateTicketCanBeUsed(ticket);

        ticket.setStatus("USED");
        ticket.setUsedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket useTicketByCode(String ticketCode) {
        Ticket ticket = getTicketByCode(ticketCode);

        validateTicketCanBeUsed(ticket);

        ticket.setStatus("USED");
        ticket.setUsedAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    @Transactional
    public List<Ticket> cancelTicketsByBooking(
            Long bookingId
    ) {
        List<Ticket> tickets =
                ticketRepository
                        .findByBookingIdOrderByIssuedAtDesc(
                                bookingId
                        );

        for (Ticket ticket : tickets) {
            ticket.setStatus("CANCELLED");
        }

        return ticketRepository.saveAll(tickets);
    }

    @Transactional
    public Ticket updateTicket(
            Long id,
            Ticket request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket request is required"
            );
        }

        Ticket oldTicket = getTicketById(id);

        if (request.getBookingId() != null) {
            oldTicket.setBookingId(
                    request.getBookingId()
            );
        }

        if (request.getUserId() != null) {
            oldTicket.setUserId(
                    request.getUserId()
            );
        }

        if (request.getEventId() != null) {
            oldTicket.setEventId(
                    request.getEventId()
            );
        }

        if (request.getSeatId() != null) {
            oldTicket.setSeatId(
                    request.getSeatId()
            );
        }

        if (request.getTicketType() != null
                && !request.getTicketType().isBlank()) {

            oldTicket.setTicketType(
                    request.getTicketType()
                            .trim()
                            .toUpperCase(Locale.ROOT)
            );
        }

        if (request.getPrice() != null) {
            oldTicket.setPrice(
                    request.getPrice()
            );
        }

        if (request.getStatus() != null
                && !request.getStatus().isBlank()) {

            String newStatus =
                    normalizeAndValidateStatus(
                            request.getStatus()
                    );

            oldTicket.setStatus(newStatus);

            if ("USED".equals(newStatus)
                    && oldTicket.getUsedAt() == null) {

                oldTicket.setUsedAt(
                        LocalDateTime.now()
                );
            }

            if ("VALID".equals(newStatus)) {
                oldTicket.setUsedAt(null);
            }
        }

        refreshQrData(oldTicket);

        return ticketRepository.save(oldTicket);
    }

    @Transactional
    public Ticket regenerateTicketCode(Long id) {
        Ticket ticket = getTicketById(id);

        ticket.setTicketCode(
                generateUniqueTicketCode()
        );

        refreshQrData(ticket);

        return ticketRepository.save(ticket);
    }

    @Transactional
    public void deleteTicket(Long id) {
        if (!ticketRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Ticket not found: " + id
            );
        }

        ticketRepository.deleteById(id);
    }

    private List<String> parseStatuses(String status) {
        if (status == null || status.isBlank()) {
            return List.of();
        }

        List<String> statuses = new ArrayList<>();

        for (String item : status.split(",")) {
            String normalized =
                    item.trim().toUpperCase(Locale.ROOT);

            if (!normalized.isBlank()
                    && ALLOWED_STATUSES.contains(normalized)) {

                statuses.add(normalized);
            }
        }

        return statuses;
    }

    private void validateIssueRequest(
            TicketCreateRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket request is required"
            );
        }

        if (request.getBookingId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "bookingId is required"
            );
        }

        if (request.getUserId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "userId is required"
            );
        }

        if (request.getEventId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId is required"
            );
        }

        if (request.getSeatId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "seatId is required"
            );
        }

        if (request.getPrice() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price is required"
            );
        }

        if (request.getPrice() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price must be greater than or equal to 0"
            );
        }
    }

    private void validateTicketFields(Ticket ticket) {
        if (ticket.getBookingId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "bookingId is required"
            );
        }

        if (ticket.getUserId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "userId is required"
            );
        }

        if (ticket.getEventId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId is required"
            );
        }

        if (ticket.getSeatId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "seatId is required"
            );
        }

        if (ticket.getPrice() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price is required"
            );
        }

        if (ticket.getPrice() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price must be greater than or equal to 0"
            );
        }
    }

    private void validateTicketCanBeUsed(Ticket ticket) {
        String currentStatus =
                ticket.getStatus() == null
                        ? ""
                        : ticket.getStatus()
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if ("USED".equals(currentStatus)
                || "CHECKED_IN".equals(currentStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket has already been used: "
                            + ticket.getTicketCode()
            );
        }

        if (!"VALID".equals(currentStatus)
                && !"ACTIVE".equals(currentStatus)
                && !"PAID".equals(currentStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket is not valid. Current status: "
                            + currentStatus
            );
        }
    }

    private String normalizeAndValidateStatus(
            String status
    ) {
        String normalizedStatus =
                status.trim()
                        .toUpperCase(Locale.ROOT);

        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid ticket status: " + status
            );
        }

        return normalizedStatus;
    }

    private String normalizeSortField(String sortBy) {
        if (sortBy == null
                || !ALLOWED_SORT_FIELDS.contains(sortBy)) {

            return "issuedAt";
        }

        return sortBy;
    }

    private String generateUniqueTicketCode() {
        String ticketCode;

        do {
            ticketCode =
                    "TKT-"
                            + UUID.randomUUID()
                            .toString()
                            .replace("-", "")
                            .substring(0, 16)
                            .toUpperCase(Locale.ROOT);
        } while (
                ticketRepository.existsByTicketCode(
                        ticketCode
                )
        );

        return ticketCode;
    }

    private String buildQrContent(Ticket ticket) {
        return ticket.getTicketCode();
    }

    private void refreshQrData(Ticket ticket) {
        String qrContent = buildQrContent(ticket);

        ticket.setQrContent(qrContent);
        ticket.setQrImage(
                generateQrImage(qrContent)
        );
    }

    private String generateQrImage(String content) {
        try {
            BitMatrix bitMatrix =
                    new MultiFormatWriter()
                            .encode(
                                    content,
                                    BarcodeFormat.QR_CODE,
                                    300,
                                    300
                            );

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            MatrixToImageWriter.writeToStream(
                    bitMatrix,
                    "PNG",
                    outputStream
            );

            String base64 =
                    Base64.getEncoder()
                            .encodeToString(
                                    outputStream.toByteArray()
                            );

            return "data:image/png;base64," + base64;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cannot generate QR image"
            );
        }
    }
}