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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TicketService {

    private static final Set<String>
            ALLOWED_SORT_FIELDS = Set.of(
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

    private static final Set<String>
            ALLOWED_STATUSES = Set.of(
            "VALID",
            "ACTIVE",
            "PAID",
            "USED",
            "CHECKED_IN",
            "CANCELLED",
            "EXPIRED",
            "FAILED"
    );

    private static final Set<String>
            ADMIN_ROLES = Set.of(
            "ADMIN",
            "ORGANIZER",
            "SERVICE",
            "INTERNAL"
    );

    private final TicketRepository
            ticketRepository;

    /*
     * =====================================================
     * SEARCH + FILTER + PAGINATION
     * =====================================================
     */
    @Transactional(readOnly = true)
    public Page<Ticket> searchTickets(
            String keyword,
            String status,
            Long userId,
            Long eventId,
            Long bookingId,
            String ticketType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        validateOptionalId(
                userId,
                "userId"
        );

        validateOptionalId(
                eventId,
                "eventId"
        );

        validateOptionalId(
                bookingId,
                "bookingId"
        );

        if (
                fromDate != null &&
                toDate != null &&
                fromDate.isAfter(toDate)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "fromDate must be before or equal to toDate"
            );
        }

        int safePage =
                Math.max(page, 0);

        int safeSize =
                Math.min(
                        Math.max(size, 1),
                        100
                );

        String safeSortBy =
                normalizeSortField(
                        sortBy
                );

        Sort.Direction direction =
                "asc".equalsIgnoreCase(
                        sortDirection
                )
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        Pageable pageable =
                PageRequest.of(
                        safePage,
                        safeSize,
                        Sort.by(
                                direction,
                                safeSortBy
                        )
                );

        Specification<Ticket> specification =
                (
                        root,
                        query,
                        criteriaBuilder
                ) -> {
                    List<Predicate> predicates =
                            new ArrayList<>();

                    if (
                            keyword != null &&
                            !keyword.isBlank()
                    ) {
                        String trimmedKeyword =
                                keyword.trim();

                        String likeKeyword =
                                "%"
                                        + trimmedKeyword
                                        .toLowerCase(
                                                Locale.ROOT
                                        )
                                        + "%";

                        List<Predicate>
                                keywordPredicates =
                                new ArrayList<>();

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "ticketCode"
                                                )
                                        ),
                                        likeKeyword
                                )
                        );

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "ticketType"
                                                )
                                        ),
                                        likeKeyword
                                )
                        );

                        keywordPredicates.add(
                                criteriaBuilder.like(
                                        criteriaBuilder.lower(
                                                root.<String>get(
                                                        "status"
                                                )
                                        ),
                                        likeKeyword
                                )
                        );

                        try {
                            Long numericKeyword =
                                    Long.valueOf(
                                            trimmedKeyword
                                    );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get("id"),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get(
                                                    "bookingId"
                                            ),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get(
                                                    "userId"
                                            ),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get(
                                                    "eventId"
                                            ),
                                            numericKeyword
                                    )
                            );

                            keywordPredicates.add(
                                    criteriaBuilder.equal(
                                            root.get(
                                                    "seatId"
                                            ),
                                            numericKeyword
                                    )
                            );
                        } catch (
                                NumberFormatException ignored
                        ) {
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
                            parseStatuses(
                                    status
                            );

                    if (
                            !statusValues.isEmpty()
                    ) {
                        predicates.add(
                                criteriaBuilder
                                        .upper(
                                                root.<String>get(
                                                        "status"
                                                )
                                        )
                                        .in(
                                                statusValues
                                        )
                        );
                    }

                    if (userId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get(
                                                "userId"
                                        ),
                                        userId
                                )
                        );
                    }

                    if (eventId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get(
                                                "eventId"
                                        ),
                                        eventId
                                )
                        );
                    }

                    if (bookingId != null) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get(
                                                "bookingId"
                                        ),
                                        bookingId
                                )
                        );
                    }

                    if (
                            ticketType != null &&
                            !ticketType.isBlank()
                    ) {
                        predicates.add(
                                criteriaBuilder.equal(
                                        criteriaBuilder.upper(
                                                root.<String>get(
                                                        "ticketType"
                                                )
                                        ),
                                        normalizeTicketType(
                                                ticketType
                                        )
                                )
                        );
                    }

                    if (fromDate != null) {
                        predicates.add(
                                criteriaBuilder
                                        .greaterThanOrEqualTo(
                                                root.get(
                                                        "issuedAt"
                                                ),
                                                fromDate
                                        )
                        );
                    }

                    if (toDate != null) {
                        predicates.add(
                                criteriaBuilder
                                        .lessThanOrEqualTo(
                                                root.get(
                                                        "issuedAt"
                                                ),
                                                toDate
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
            Long requestedUserId,
            Long currentUserId,
            String currentRole,
            String keyword,
            String status,
            String ticketType,
            Long eventId,
            Long bookingId,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        requireOwnerOrAdmin(
                requestedUserId,
                currentUserId,
                currentRole
        );

        return searchTickets(
                keyword,
                status,
                requestedUserId,
                eventId,
                bookingId,
                ticketType,
                null,
                null,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    @Transactional(readOnly = true)
    public Page<Ticket> searchTicketsByBooking(
            Long bookingId,
            Long currentUserId,
            String currentRole,
            String keyword,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        validateRequiredId(
                bookingId,
                "bookingId"
        );

        Long effectiveUserId =
                isAdmin(currentRole)
                        ? null
                        : requireCurrentUserId(
                                currentUserId
                        );

        return searchTickets(
                keyword,
                status,
                effectiveUserId,
                null,
                bookingId,
                null,
                null,
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
                null,
                null,
                page,
                size,
                sortBy,
                sortDirection
        );
    }

    /*
     * =====================================================
     * GET
     * =====================================================
     */
    @Transactional(readOnly = true)
    public Ticket getTicketById(
            Long id
    ) {
        validateRequiredId(
                id,
                "ticketId"
        );

        return ticketRepository
                .findById(id)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket not found: "
                                                + id
                                )
                );
    }

    @Transactional(readOnly = true)
    public Ticket getTicketByIdAuthorized(
            Long id,
            Long currentUserId,
            String currentRole
    ) {
        Ticket ticket =
                getTicketById(id);

        requireOwnerOrAdmin(
                ticket.getUserId(),
                currentUserId,
                currentRole
        );

        return ticket;
    }

    @Transactional(readOnly = true)
    public Ticket getTicketByCode(
            String ticketCode
    ) {
        if (
                ticketCode == null ||
                ticketCode.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ticketCode is required"
            );
        }

        return ticketRepository
                .findByTicketCodeIgnoreCase(
                        ticketCode.trim()
                )
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket not found: "
                                                + ticketCode
                                )
                );
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByEvent(
            Long eventId
    ) {
        validateRequiredId(
                eventId,
                "eventId"
        );

        return ticketRepository
                .findByEventIdOrderByIssuedAtDesc(
                        eventId
                );
    }

    @Transactional(readOnly = true)
    public List<Ticket>
    getTicketsByBookingAuthorized(
            Long bookingId,
            Long currentUserId,
            String currentRole
    ) {
        validateRequiredId(
                bookingId,
                "bookingId"
        );

        List<Ticket> tickets =
                ticketRepository
                        .findByBookingIdOrderByIssuedAtDesc(
                                bookingId
                        );

        if (
                !isAdmin(currentRole)
        ) {
            Long safeCurrentUserId =
                    requireCurrentUserId(
                            currentUserId
                    );

            boolean unauthorized =
                    tickets.stream()
                            .anyMatch(
                                    ticket ->
                                            !Objects.equals(
                                                    ticket.getUserId(),
                                                    safeCurrentUserId
                                            )
                            );

            if (unauthorized) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You cannot access tickets of another user"
                );
            }
        }

        return tickets;
    }

    @Transactional(readOnly = true)
    public List<Ticket>
    getTicketsByUserAuthorized(
            Long requestedUserId,
            Long currentUserId,
            String currentRole
    ) {
        requireOwnerOrAdmin(
                requestedUserId,
                currentUserId,
                currentRole
        );

        return ticketRepository
                .findByUserIdOrderByIssuedAtDesc(
                        requestedUserId
                );
    }

    /*
     * =====================================================
     * CREATE / ISSUE
     * =====================================================
     */
    @Transactional
    public Ticket createTicket(
            Ticket request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket request is required"
            );
        }

        validateTicketFields(
                request
        );

        ensureTicketPairAvailable(
                request.getBookingId(),
                request.getSeatId(),
                null
        );

        Ticket ticket =
                new Ticket();

        ticket.setBookingId(
                request.getBookingId()
        );

        ticket.setUserId(
                request.getUserId()
        );

        ticket.setEventId(
                request.getEventId()
        );

        ticket.setSeatId(
                request.getSeatId()
        );

        ticket.setTicketType(
                normalizeTicketType(
                        request.getTicketType()
                )
        );

        ticket.setPrice(
                validatePrice(
                        request.getPrice()
                )
        );

        ticket.setStatus(
                request.getStatus() ==
                        null ||
                request.getStatus()
                        .isBlank()
                        ? "VALID"
                        : normalizeAndValidateStatus(
                                request.getStatus()
                        )
        );

        ticket.setTicketCode(
                normalizeOrGenerateCode(
                        request.getTicketCode()
                )
        );

        ticket.setIssuedAt(
                request.getIssuedAt() ==
                        null
                        ? LocalDateTime.now()
                        : request.getIssuedAt()
        );

        refreshQrData(ticket);

        return saveTicket(ticket);
    }

    @Transactional
    public Ticket issueTicket(
            TicketCreateRequest request
    ) {
        validateIssueRequest(
                request
        );

        return issueTicketInternal(
                request
        );
    }

    @Transactional
    public List<Ticket> issueTickets(
            List<TicketCreateRequest>
                    requests
    ) {
        if (
                requests == null ||
                requests.isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket requests are required"
            );
        }

        if (requests.size() > 500) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot issue more than 500 tickets at once"
            );
        }

        List<Ticket> tickets =
                new ArrayList<>();

        for (
                TicketCreateRequest request :
                requests
        ) {
            validateIssueRequest(
                    request
            );

            tickets.add(
                    issueTicketInternal(
                            request
                    )
            );
        }

        return tickets;
    }

    private Ticket issueTicketInternal(
            TicketCreateRequest request
    ) {
        Optional<Ticket> existingOptional =
                ticketRepository
                        .findByBookingIdAndSeatId(
                                request.getBookingId(),
                                request.getSeatId()
                        );

        if (existingOptional.isPresent()) {
            Ticket existing =
                    existingOptional.get();

            String existingStatus =
                    normalizeStatus(
                            existing.getStatus()
                    );

            if (
                    "USED".equals(existingStatus) ||
                    "CHECKED_IN".equals(existingStatus)
            ) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket for booking "
                                + request.getBookingId()
                                + " and seat "
                                + request.getSeatId()
                                + " has already been used"
                );
            }

            /*
             * Callback có thể chạy lại sau timeout.
             * Dùng lại bản ghi cũ và kích hoạt lại vé
             * nếu trước đó nó bị CANCELLED/FAILED/EXPIRED.
             */
            existing.setUserId(
                    request.getUserId()
            );

            existing.setEventId(
                    request.getEventId()
            );

            existing.setTicketType(
                    normalizeTicketType(
                            request.getTicketType()
                    )
            );

            existing.setPrice(
                    validatePrice(
                            request.getPrice()
                    )
            );

            existing.setStatus("VALID");
            existing.setUsedAt(null);

            if (existing.getIssuedAt() == null) {
                existing.setIssuedAt(
                        LocalDateTime.now()
                );
            }

            refreshQrData(existing);

            return saveTicket(existing);
        }

        Ticket ticket = new Ticket();

        ticket.setBookingId(
                request.getBookingId()
        );

        ticket.setUserId(
                request.getUserId()
        );

        ticket.setEventId(
                request.getEventId()
        );

        ticket.setSeatId(
                request.getSeatId()
        );

        ticket.setTicketType(
                normalizeTicketType(
                        request.getTicketType()
                )
        );

        ticket.setPrice(
                validatePrice(
                        request.getPrice()
                )
        );

        ticket.setTicketCode(
                generateUniqueTicketCode()
        );

        ticket.setStatus("VALID");

        ticket.setIssuedAt(
                LocalDateTime.now()
        );

        refreshQrData(ticket);

        return saveTicket(ticket);
    }

    /*
     * =====================================================
     * CHECK-IN
     * =====================================================
     */
    @Transactional
    public Ticket useTicket(
            Long id
    ) {
        Ticket currentTicket =
                getTicketById(id);

        validateTicketCanBeUsed(
                currentTicket
        );

        int updated =
                ticketRepository
                        .markTicketUsedIfValid(
                                id,
                                LocalDateTime.now()
                        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket has already been used or is no longer valid"
            );
        }

        return getTicketById(id);
    }

    @Transactional
    public Ticket useTicketByCode(
            String ticketCode
    ) {
        Ticket ticket =
                getTicketByCode(
                        ticketCode
                );

        return useTicket(
                ticket.getId()
        );
    }

    /*
     * =====================================================
     * UPDATE
     * =====================================================
     */
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

        Ticket ticket =
                getTicketById(id);

        ensureRelationshipUnchanged(
                ticket,
                request
        );

        if (
                request.getTicketType() !=
                        null &&
                !request.getTicketType()
                        .isBlank()
        ) {
            ticket.setTicketType(
                    normalizeTicketType(
                            request.getTicketType()
                    )
            );
        }

        if (
                request.getPrice() != null
        ) {
            ticket.setPrice(
                    validatePrice(
                            request.getPrice()
                    )
            );
        }

        if (
                request.getStatus() !=
                        null &&
                !request.getStatus()
                        .isBlank()
        ) {
            String oldStatus =
                    normalizeStatus(
                            ticket.getStatus()
                    );

            String newStatus =
                    normalizeAndValidateStatus(
                            request.getStatus()
                    );

            if (
                    isUsedStatus(oldStatus) &&
                    !isUsedStatus(newStatus)
            ) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "USED ticket cannot return to another status"
                );
            }

            ticket.setStatus(
                    newStatus
            );

            if (
                    isUsedStatus(newStatus) &&
                    ticket.getUsedAt() ==
                            null
            ) {
                ticket.setUsedAt(
                        LocalDateTime.now()
                );
            }

            if (
                    isValidStatus(newStatus)
            ) {
                ticket.setUsedAt(null);
            }
        }

        refreshQrData(ticket);

        return saveTicket(ticket);
    }

    @Transactional
    public Ticket regenerateTicketCode(
            Long id
    ) {
        Ticket ticket =
                getTicketById(id);

        String status =
                normalizeStatus(
                        ticket.getStatus()
                );

        if (!isValidStatus(status)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only a valid ticket can regenerate its code"
            );
        }

        ticket.setTicketCode(
                generateUniqueTicketCode()
        );

        refreshQrData(ticket);

        return saveTicket(ticket);
    }

    @Transactional
    public List<Ticket>
    cancelTicketsByBooking(
            Long bookingId
    ) {
        validateRequiredId(
                bookingId,
                "bookingId"
        );

        List<Ticket> tickets =
                ticketRepository
                        .findByBookingIdOrderByIssuedAtDesc(
                                bookingId
                        );

        for (Ticket ticket : tickets) {
            String status =
                    normalizeStatus(
                            ticket.getStatus()
                    );

            /*
             * Vé đã check-in giữ nguyên USED
             * để bảo toàn lịch sử.
             */
            if (!isUsedStatus(status)) {
                ticket.setStatus(
                        "CANCELLED"
                );
            }
        }

        return ticketRepository
                .saveAll(tickets);
    }

    @Transactional
    public void deleteTicket(
            Long id
    ) {
        Ticket ticket =
                getTicketById(id);

        if (
                isUsedStatus(
                        normalizeStatus(
                                ticket.getStatus()
                        )
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "USED ticket cannot be deleted"
            );
        }

        ticketRepository.delete(ticket);
    }

    /*
     * =====================================================
     * AUTHORIZATION
     * =====================================================
     */
    public void requireAdmin(
            String role
    ) {
        if (!isAdmin(role)) {
            if (
                    role == null ||
                    role.isBlank()
            ) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authentication is required"
                );
            }

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Admin permission is required"
            );
        }
    }

    private void requireOwnerOrAdmin(
            Long requestedUserId,
            Long currentUserId,
            String currentRole
    ) {
        validateRequiredId(
                requestedUserId,
                "userId"
        );

        if (isAdmin(currentRole)) {
            return;
        }

        Long safeCurrentUserId =
                requireCurrentUserId(
                        currentUserId
                );

        if (
                !Objects.equals(
                        requestedUserId,
                        safeCurrentUserId
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot access tickets of another user"
            );
        }
    }

    private Long requireCurrentUserId(
            Long currentUserId
    ) {
        if (
                currentUserId == null ||
                currentUserId <= 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "X-User-Id is required"
            );
        }

        return currentUserId;
    }

    private boolean isAdmin(
            String role
    ) {
        if (
                role == null ||
                role.isBlank()
        ) {
            return false;
        }

        String normalizedRole =
                role
                        .trim()
                        .replaceFirst(
                                "(?i)^ROLE_",
                                ""
                        )
                        .toUpperCase(
                                Locale.ROOT
                        );

        return ADMIN_ROLES.contains(
                normalizedRole
        );
    }

    /*
     * =====================================================
     * VALIDATION
     * =====================================================
     */
    private void validateIssueRequest(
            TicketCreateRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket request is required"
            );
        }

        validateRequiredId(
                request.getBookingId(),
                "bookingId"
        );

        validateRequiredId(
                request.getUserId(),
                "userId"
        );

        validateRequiredId(
                request.getEventId(),
                "eventId"
        );

        validateRequiredId(
                request.getSeatId(),
                "seatId"
        );

        validatePrice(
                request.getPrice()
        );
    }

    private void validateTicketFields(
            Ticket ticket
    ) {
        validateRequiredId(
                ticket.getBookingId(),
                "bookingId"
        );

        validateRequiredId(
                ticket.getUserId(),
                "userId"
        );

        validateRequiredId(
                ticket.getEventId(),
                "eventId"
        );

        validateRequiredId(
                ticket.getSeatId(),
                "seatId"
        );

        validatePrice(
                ticket.getPrice()
        );
    }

    private void validateRequiredId(
            Long id,
            String fieldName
    ) {
        if (
                id == null ||
                id <= 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName
                            + " must be greater than 0"
            );
        }
    }

    private void validateOptionalId(
            Long id,
            String fieldName
    ) {
        if (
                id != null &&
                id <= 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName
                            + " must be greater than 0"
            );
        }
    }

    private Double validatePrice(
            Double price
    ) {
        if (price == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price is required"
            );
        }

        if (
                price.isNaN() ||
                price.isInfinite() ||
                price < 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "price must be greater than or equal to 0"
            );
        }

        return price;
    }

    private void validateTicketCanBeUsed(
            Ticket ticket
    ) {
        String status =
                normalizeStatus(
                        ticket.getStatus()
                );

        if (isUsedStatus(status)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket has already been used: "
                            + ticket.getTicketCode()
            );
        }

        if (!isValidStatus(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket is not valid. Current status: "
                            + status
            );
        }
    }

    private void ensureTicketPairAvailable(
            Long bookingId,
            Long seatId,
            Long currentTicketId
    ) {
        boolean duplicate =
                currentTicketId == null
                        ? ticketRepository
                        .findByBookingIdAndSeatId(
                                bookingId,
                                seatId
                        )
                        .isPresent()
                        : ticketRepository
                        .existsByBookingIdAndSeatIdAndIdNot(
                                bookingId,
                                seatId,
                                currentTicketId
                        );

        if (duplicate) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket already exists for booking "
                            + bookingId
                            + " and seat "
                            + seatId
            );
        }
    }

    private void ensureRelationshipUnchanged(
            Ticket current,
            Ticket request
    ) {
        if (
                request.getBookingId() !=
                        null &&
                !Objects.equals(
                        current.getBookingId(),
                        request.getBookingId()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "bookingId cannot be changed after ticket issuance"
            );
        }

        if (
                request.getUserId() !=
                        null &&
                !Objects.equals(
                        current.getUserId(),
                        request.getUserId()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "userId cannot be changed after ticket issuance"
            );
        }

        if (
                request.getEventId() !=
                        null &&
                !Objects.equals(
                        current.getEventId(),
                        request.getEventId()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "eventId cannot be changed after ticket issuance"
            );
        }

        if (
                request.getSeatId() !=
                        null &&
                !Objects.equals(
                        current.getSeatId(),
                        request.getSeatId()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "seatId cannot be changed after ticket issuance"
            );
        }
    }

    /*
     * =====================================================
     * NORMALIZE
     * =====================================================
     */
    private List<String> parseStatuses(
            String status
    ) {
        if (
                status == null ||
                status.isBlank()
        ) {
            return List.of();
        }

        List<String> statuses =
                new ArrayList<>();

        for (
                String item :
                status.split(",")
        ) {
            String normalized =
                    normalizeStatus(item);

            if (
                    !ALLOWED_STATUSES
                            .contains(
                                    normalized
                            )
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid ticket status: "
                                + item
                );
            }

            if (
                    !statuses.contains(
                            normalized
                    )
            ) {
                statuses.add(
                        normalized
                );
            }
        }

        return statuses;
    }

    private String
    normalizeAndValidateStatus(
            String status
    ) {
        String normalized =
                normalizeStatus(status);

        if (
                !ALLOWED_STATUSES
                        .contains(normalized)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid ticket status: "
                            + status
            );
        }

        return normalized;
    }

    private String normalizeStatus(
            String status
    ) {
        return String.valueOf(
                status == null
                        ? ""
                        : status
        )
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private String normalizeTicketType(
            String ticketType
    ) {
        String normalized =
                ticketType == null ||
                ticketType.isBlank()
                        ? "STANDARD"
                        : ticketType
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (normalized.length() > 50) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ticketType cannot exceed 50 characters"
            );
        }

        return normalized;
    }

    private String normalizeSortField(
            String sortBy
    ) {
        if (
                sortBy == null ||
                !ALLOWED_SORT_FIELDS
                        .contains(sortBy)
        ) {
            return "issuedAt";
        }

        return sortBy;
    }

    private boolean isValidStatus(
            String status
    ) {
        return "VALID".equals(status)
                || "ACTIVE".equals(status)
                || "PAID".equals(status);
    }

    private boolean isUsedStatus(
            String status
    ) {
        return "USED".equals(status)
                || "CHECKED_IN".equals(
                        status
                );
    }

    /*
     * =====================================================
     * CODE + QR
     * =====================================================
     */
    private String normalizeOrGenerateCode(
            String requestedCode
    ) {
        if (
                requestedCode == null ||
                requestedCode.isBlank()
        ) {
            return generateUniqueTicketCode();
        }

        String normalized =
                requestedCode
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (
                ticketRepository
                        .existsByTicketCodeIgnoreCase(
                                normalized
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket code already exists: "
                            + normalized
            );
        }

        return normalized;
    }

    private String
    generateUniqueTicketCode() {
        String ticketCode;

        do {
            ticketCode =
                    "TKT-"
                            + UUID.randomUUID()
                            .toString()
                            .replace("-", "")
                            .substring(0, 16)
                            .toUpperCase(
                                    Locale.ROOT
                            );
        } while (
                ticketRepository
                        .existsByTicketCodeIgnoreCase(
                                ticketCode
                        )
        );

        return ticketCode;
    }

    private void refreshQrData(
            Ticket ticket
    ) {
        String qrContent =
                ticket.getTicketCode();

        ticket.setQrContent(
                qrContent
        );

        ticket.setQrImage(
                generateQrImage(
                        qrContent
                )
        );
    }

    private String generateQrImage(
            String content
    ) {
        try {
            BitMatrix bitMatrix =
                    new MultiFormatWriter()
                            .encode(
                                    content,
                                    BarcodeFormat.QR_CODE,
                                    300,
                                    300
                            );

            ByteArrayOutputStream
                    outputStream =
                    new ByteArrayOutputStream();

            MatrixToImageWriter
                    .writeToStream(
                            bitMatrix,
                            "PNG",
                            outputStream
                    );

            String base64 =
                    Base64
                            .getEncoder()
                            .encodeToString(
                                    outputStream
                                            .toByteArray()
                            );

            return "data:image/png;base64,"
                    + base64;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cannot generate QR image"
            );
        }
    }

    private Ticket saveTicket(
            Ticket ticket
    ) {
        try {
            return ticketRepository.save(
                    ticket
            );
        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket code or booking-seat pair already exists"
            );
        }
    }
}