package com.example.notification_service.service;

import com.example.notification_service.dto.NotificationCreateRequest;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.event.*;
import com.example.notification_service.repository.NotificationRepository;
import com.example.notification_service.specification.NotificationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "SYSTEM",
            "BOOKING_CREATED",
            "BOOKING_CANCELLED",
            "PAYMENT_SUCCESS",
            "PAYMENT_FAILED",
            "TICKET_ISSUED");

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "userId",
            "bookingId",
            "type",
            "isRead",
            "createdAt",
            "readAt",
            "updatedAt");

    private final NotificationRepository notificationRepository;

    public Page<Notification> searchAllNotifications(
            int page,
            int size,
            String keyword,
            Long userId,
            Long bookingId,
            String type,
            Boolean isRead,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            String sortBy,
            String sortDirection,
            String role) {
        requireAdmin(role);
        validatePage(page, size);

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(
                        sortBy,
                        sortDirection));

        return notificationRepository.findAll(
                NotificationSpecification.filter(
                        keyword,
                        userId,
                        bookingId,
                        normalizeOptionalType(type),
                        isRead,
                        fromDate,
                        toDate),
                pageable);
    }

    public Page<Notification> searchNotificationsByUser(
            Long userId,
            int page,
            int size,
            String keyword,
            String type,
            Boolean isRead,
            String sortBy,
            String sortDirection,
            Long currentUserId,
            String role) {
        checkOwnerOrAdmin(
                userId,
                currentUserId,
                role);

        validatePage(page, size);

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(
                        sortBy,
                        sortDirection));

        return notificationRepository.findAll(
                NotificationSpecification.filter(
                        keyword,
                        userId,
                        null,
                        normalizeOptionalType(type),
                        isRead,
                        null,
                        null),
                pageable);
    }

    public Page<Notification> searchNotificationsByBooking(
            Long bookingId,
            int page,
            int size,
            String keyword,
            String type,
            Boolean isRead,
            String sortBy,
            String sortDirection,
            Long currentUserId,
            String role) {
        validatePage(page, size);

        /*
         * ADMIN xem mọi thông báo của booking.
         * User chỉ xem notification của chính user đó.
         */
        Long userIdFilter = isAdmin(role)
                ? null
                : requireCurrentUserId(currentUserId);

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(
                        sortBy,
                        sortDirection));

        return notificationRepository.findAll(
                NotificationSpecification.filter(
                        keyword,
                        userIdFilter,
                        bookingId,
                        normalizeOptionalType(type),
                        isRead,
                        null,
                        null),
                pageable);
    }

    public Notification getNotificationById(
            Long id,
            Long currentUserId,
            String role) {
        Notification notification = findById(id);

        checkOwnerOrAdmin(
                notification.getUserId(),
                currentUserId,
                role);

        return notification;
    }

    public long getUnreadCount(
            Long userId,
            Long currentUserId,
            String role) {
        checkOwnerOrAdmin(
                userId,
                currentUserId,
                role);

        return notificationRepository
                .countByUserIdAndIsReadFalse(
                        userId);
    }

    public Notification createManualNotification(
            NotificationCreateRequest request,
            String role) {
        requireAdmin(role);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notification data is required");
        }

        validateRequiredFields(
                request.getUserId(),
                request.getTitle(),
                request.getMessage());

        Notification notification = new Notification();

        notification.setUserId(
                request.getUserId());

        notification.setBookingId(
                request.getBookingId());

        notification.setTitle(
                request
                        .getTitle()
                        .trim());

        notification.setMessage(
                request
                        .getMessage()
                        .trim());

        notification.setType(
                normalizeRequiredType(
                        request.getType()));

        notification.setActionUrl(
                normalizeNullableText(
                        request.getActionUrl()));

        notification.setIsRead(false);

        return notificationRepository.save(
                notification);
    }

    public Notification markAsRead(
            Long id,
            Long currentUserId,
            String role) {
        Notification notification = findById(id);

        checkOwnerOrAdmin(
                notification.getUserId(),
                currentUserId,
                role);

        if (Boolean.TRUE.equals(
                notification.getIsRead())) {
            return notification;
        }

        notification.setIsRead(true);
        notification.setReadAt(
                LocalDateTime.now());

        return notificationRepository.save(
                notification);
    }

    public Notification markAsUnread(
            Long id,
            Long currentUserId,
            String role) {
        Notification notification = findById(id);

        checkOwnerOrAdmin(
                notification.getUserId(),
                currentUserId,
                role);

        notification.setIsRead(false);
        notification.setReadAt(null);

        return notificationRepository.save(
                notification);
    }

    @Transactional
    public int markAllAsRead(
            Long userId,
            Long currentUserId,
            String role) {
        checkOwnerOrAdmin(
                userId,
                currentUserId,
                role);

        return notificationRepository
                .markAllAsReadByUserId(
                        userId,
                        LocalDateTime.now());
    }

    public void deleteNotification(
            Long id,
            Long currentUserId,
            String role) {
        Notification notification = findById(id);

        checkOwnerOrAdmin(
                notification.getUserId(),
                currentUserId,
                role);

        notificationRepository.delete(
                notification);
    }

    public Notification createFromBookingCreated(
            BookingCreatedEvent event) {
        validateRabbitEvent(
                event == null
                        ? null
                        : event.getUserId(),
                event == null
                        ? null
                        : event.getBookingId(),
                "booking.created");

        String eventKey = createEventKey(
                event.getMessageId(),
                "BOOKING_CREATED:"
                        + event.getBookingId());

        String message = event.getMessage();

        if (message == null
                || message.isBlank()) {
            message = "Bạn đã đặt vé thành công. Mã booking: "
                    + safeText(
                            event.getBookingCode(),
                            String.valueOf(
                                    event.getBookingId()))
                    + ". Tổng tiền: "
                    + formatMoney(
                            event.getTotalAmount())
                    + ".";
        }

        return saveEventNotification(
                eventKey,
                event.getUserId(),
                event.getBookingId(),
                "Đặt vé thành công",
                message,
                "BOOKING_CREATED",
                "/my-bookings?bookingId="
                        + event.getBookingId());
    }

    public Notification createFromBookingCancelled(
            BookingCancelledEvent event) {
        validateRabbitEvent(
                event == null
                        ? null
                        : event.getUserId(),
                event == null
                        ? null
                        : event.getBookingId(),
                "booking.cancelled");

        String eventKey = createEventKey(
                event.getMessageId(),
                "BOOKING_CANCELLED:"
                        + event.getBookingId());

        String message = "Booking "
                + safeText(
                        event.getBookingCode(),
                        String.valueOf(
                                event.getBookingId()))
                + " đã được hủy.";

        if (event.getReason() != null
                && !event
                        .getReason()
                        .isBlank()) {
            message += " Lý do: "
                    + event
                            .getReason()
                            .trim();
        }

        return saveEventNotification(
                eventKey,
                event.getUserId(),
                event.getBookingId(),
                "Booking đã được hủy",
                message,
                "BOOKING_CANCELLED",
                "/my-bookings?bookingId="
                        + event.getBookingId());
    }

    public Notification createFromPaymentSuccess(
            PaymentStatusEvent event) {
        validateRabbitEvent(
                event == null
                        ? null
                        : event.getUserId(),
                event == null
                        ? null
                        : event.getBookingId(),
                "payment.success");

        String eventKey = createEventKey(
                event.getMessageId(),
                "PAYMENT_SUCCESS:"
                        + safeText(
                                event.getPaymentId(),
                                event.getBookingId()));

        String message = event.getMessage();

        if (message == null
                || message.isBlank()) {
            message = "Thanh toán "
                    + formatMoney(
                            event.getAmount())
                    + " cho booking #"
                    + event.getBookingId()
                    + " đã thành công.";

            if (event.getTransactionCode() != null
                    && !event
                            .getTransactionCode()
                            .isBlank()) {
                message += " Mã giao dịch: "
                        + event
                                .getTransactionCode()
                                .trim()
                        + ".";
            }
        }

        return saveEventNotification(
                eventKey,
                event.getUserId(),
                event.getBookingId(),
                "Thanh toán thành công",
                message,
                "PAYMENT_SUCCESS",
                "/my-tickets?bookingId="
                        + event.getBookingId());
    }

    public Notification createFromPaymentFailed(
            PaymentStatusEvent event) {
        validateRabbitEvent(
                event == null
                        ? null
                        : event.getUserId(),
                event == null
                        ? null
                        : event.getBookingId(),
                "payment.failed");

        String eventKey = createEventKey(
                event.getMessageId(),
                "PAYMENT_FAILED:"
                        + safeText(
                                event.getPaymentId(),
                                event.getBookingId()));

        String message = event.getMessage();

        if (message == null
                || message.isBlank()) {
            message = "Thanh toán cho booking #"
                    + event.getBookingId()
                    + " chưa thành công. Bạn có thể thử thanh toán lại.";
        }

        return saveEventNotification(
                eventKey,
                event.getUserId(),
                event.getBookingId(),
                "Thanh toán thất bại",
                message,
                "PAYMENT_FAILED",
                "/my-bookings?bookingId="
                        + event.getBookingId());
    }

    public Notification createFromTicketIssued(
            TicketIssuedEvent event) {
        if (event == null
                || event.getTicketId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ticket.issued event requires ticketId");
        }

        validateRabbitEvent(
                event.getUserId(),
                event.getBookingId(),
                "ticket.issued");

        String eventKey = createEventKey(
                event.getMessageId(),
                "TICKET_ISSUED:"
                        + event.getTicketId());

        String message = "Vé "
                + safeText(
                        event.getTicketCode(),
                        String.valueOf(
                                event.getTicketId()))
                + " đã được phát hành.";

        if (event.getTicketType() != null
                && !event
                        .getTicketType()
                        .isBlank()) {
            message += " Loại vé: "
                    + event
                            .getTicketType()
                            .trim()
                    + ".";
        }

        return saveEventNotification(
                eventKey,
                event.getUserId(),
                event.getBookingId(),
                "Vé QR đã được phát hành",
                message,
                "TICKET_ISSUED",
                "/my-tickets?bookingId="
                        + event.getBookingId());
    }

    private Notification saveEventNotification(
            String eventKey,
            Long userId,
            Long bookingId,
            String title,
            String message,
            String type,
            String actionUrl) {
        /*
         * Message Rabbit bị giao lại thì không tạo thông báo trùng.
         */
        Notification existing = notificationRepository
                .findByEventKey(eventKey)
                .orElse(null);

        if (existing != null) {
            return existing;
        }

        Notification notification = new Notification();

        notification.setUserId(userId);
        notification.setBookingId(bookingId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(
                normalizeRequiredType(type));
        notification.setEventKey(eventKey);
        notification.setActionUrl(actionUrl);
        notification.setIsRead(false);

        try {
            return notificationRepository.save(
                    notification);
        } catch (DataIntegrityViolationException exception) {
            /*
             * Hai consumer cùng kiểm tra trước khi một record được lưu.
             * Unique eventKey sẽ chặn record thứ hai.
             */
            return notificationRepository
                    .findByEventKey(eventKey)
                    .orElseThrow(
                            () -> exception);
        }
    }

    private Notification findById(
            Long id) {
        return notificationRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Notification not found: "
                                        + id));
    }

    private void validateRequiredFields(
            Long userId,
            String title,
            String message) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "userId is required");
        }

        if (title == null
                || title.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "title is required");
        }

        if (message == null
                || message.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "message is required");
        }
    }

    private void validateRabbitEvent(
            Long userId,
            Long bookingId,
            String eventName) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    eventName
                            + " event requires userId");
        }

        if (bookingId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    eventName
                            + " event requires bookingId");
        }
    }

    private String createEventKey(
            String messageId,
            String fallback) {
        if (messageId != null
                && !messageId.isBlank()) {
            return messageId.trim();
        }

        return fallback;
    }

    private String normalizeOptionalType(
            String type) {
        if (type == null
                || type.isBlank()
                || "ALL".equalsIgnoreCase(
                        type)) {
            return null;
        }

        return normalizeRequiredType(type);
    }

    private String normalizeRequiredType(
            String type) {
        String normalized = type == null
                || type.isBlank()
                        ? "SYSTEM"
                        : type
                                .trim()
                                .toUpperCase();

        if (!ALLOWED_TYPES.contains(
                normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid notification type: "
                            + type);
        }

        return normalized;
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
                    "You cannot access another user's notification");
        }
    }

    private Long requireCurrentUserId(
            Long currentUserId) {
        if (currentUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Missing user token");
        }

        return currentUserId;
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
        if (role == null
                || role.isBlank()) {
            return false;
        }

        String normalized = role
                .trim()
                .toUpperCase();

        return "ADMIN".equals(normalized)
                || "ROLE_ADMIN".equals(normalized);
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

    private Sort createSort(
            String sortBy,
            String sortDirection) {
        String field = ALLOWED_SORT_FIELDS.contains(
                sortBy)
                        ? sortBy
                        : "createdAt";

        Sort.Direction direction = "asc".equalsIgnoreCase(
                sortDirection)
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        return Sort.by(
                direction,
                field);
    }

    private String normalizeNullableText(
            String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isBlank()
                ? null
                : normalized;
    }

    private String formatMoney(
            Double amount) {
        if (amount == null) {
            return "0 đ";
        }

        NumberFormat formatter = NumberFormat.getNumberInstance(
                new Locale(
                        "vi",
                        "VN"));

        return formatter.format(amount)
                + " đ";
    }

    private String safeText(
            Object value,
            Object fallback) {
        if (value == null
                || String.valueOf(value)
                        .isBlank()) {
            return String.valueOf(
                    fallback);
        }

        return String.valueOf(value);
    }
}