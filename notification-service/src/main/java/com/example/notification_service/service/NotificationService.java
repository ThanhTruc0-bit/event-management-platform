package com.example.notification_service.service;

import com.example.notification_service.dto.NotificationCreateRequest;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.event.BookingCancelledEvent;
import com.example.notification_service.event.BookingCreatedEvent;
import com.example.notification_service.event.PaymentStatusEvent;
import com.example.notification_service.event.TicketIssuedEvent;
import com.example.notification_service.repository.NotificationRepository;
import com.example.notification_service.specification.NotificationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

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

        private static final int MAX_TITLE_LENGTH = 255;

        private static final int MAX_MESSAGE_LENGTH = 2000;

        private static final int MAX_ACTION_URL_LENGTH = 500;

        private static final int MAX_EVENT_KEY_LENGTH = 180;

        private final NotificationRepository notificationRepository;

        /*
         * =====================================================
         * ADMIN: TÌM KIẾM TOÀN BỘ THÔNG BÁO
         * =====================================================
         */
        @Transactional(readOnly = true)
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

                validatePage(
                                page,
                                size);

                validateDateRange(
                                fromDate,
                                toDate);

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

        /*
         * =====================================================
         * USER: XEM THÔNG BÁO CỦA MÌNH
         * =====================================================
         */
        @Transactional(readOnly = true)
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

                validatePage(
                                page,
                                size);

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

        /*
         * ADMIN được xem mọi notification của booking.
         * USER chỉ thấy notification thuộc chính tài khoản của mình.
         */
        @Transactional(readOnly = true)
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
                validateRequiredId(
                                bookingId,
                                "bookingId");

                validatePage(
                                page,
                                size);

                Long userIdFilter = isAdmin(role)
                                ? null
                                : requireCurrentUserId(
                                                currentUserId);

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

        @Transactional(readOnly = true)
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

        @Transactional(readOnly = true)
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

        /*
         * =====================================================
         * ADMIN: TẠO THÔNG BÁO THỦ CÔNG
         * =====================================================
         */
        @Transactional
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

                if (request.getBookingId() != null &&
                                request.getBookingId() < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "bookingId must be greater than 0");
                }

                Notification notification = new Notification();

                notification.setUserId(
                                request.getUserId());

                notification.setBookingId(
                                request.getBookingId());

                notification.setTitle(
                                normalizeRequiredText(
                                                request.getTitle(),
                                                "title",
                                                MAX_TITLE_LENGTH));

                notification.setMessage(
                                normalizeRequiredText(
                                                request.getMessage(),
                                                "message",
                                                MAX_MESSAGE_LENGTH));

                notification.setType(
                                normalizeRequiredType(
                                                request.getType()));

                notification.setActionUrl(
                                normalizeActionUrl(
                                                request.getActionUrl()));

                notification.setIsRead(false);
                notification.setReadAt(null);

                return notificationRepository.save(
                                notification);
        }

        /*
         * =====================================================
         * TRẠNG THÁI ĐỌC
         *
         * Chỉ chính người nhận thông báo mới được thay đổi.
         * ADMIN chỉ xem trạng thái, không được đọc thay USER.
         * =====================================================
         */
        @Transactional
        public Notification markAsRead(
                        Long id,
                        Long currentUserId,
                        String role) {
                Notification notification = findById(id);

                requireNotificationOwner(
                                notification.getUserId(),
                                currentUserId);

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

        @Transactional
        public Notification markAsUnread(
                        Long id,
                        Long currentUserId,
                        String role) {
                Notification notification = findById(id);

                requireNotificationOwner(
                                notification.getUserId(),
                                currentUserId);

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
                requireNotificationOwner(
                                userId,
                                currentUserId);

                return notificationRepository
                                .markAllAsReadByUserId(
                                                userId,
                                                LocalDateTime.now());
        }

        /*
         * Chỉ người nhận mới được xóa notification của mình.
         * Admin không được làm mất notification của user.
         */
        @Transactional
        public void deleteNotification(
                        Long id,
                        Long currentUserId,
                        String role) {
                Notification notification = findById(id);

                requireNotificationOwner(
                                notification.getUserId(),
                                currentUserId);

                notificationRepository.delete(
                                notification);
        }

        /*
         * =====================================================
         * RABBITMQ: BOOKING CREATED
         * =====================================================
         */
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
                                "BOOKING_CREATED",
                                event.getMessageId(),
                                "BOOKING_CREATED:" +
                                                event.getBookingId());

                String message = event.getMessage();

                if (message == null ||
                                message.isBlank()) {
                        message = "Bạn đã đặt vé thành công. Mã booking: " +
                                        safeText(
                                                        event.getBookingCode(),
                                                        event.getBookingId())
                                        +
                                        ". Tổng tiền: " +
                                        formatMoney(
                                                        event.getTotalAmount())
                                        +
                                        ".";
                }

                return saveEventNotification(
                                eventKey,
                                event.getUserId(),
                                event.getBookingId(),
                                "Đặt vé thành công",
                                message,
                                "BOOKING_CREATED",
                                "/my-bookings?bookingId=" +
                                                event.getBookingId());
        }

        /*
         * =====================================================
         * RABBITMQ: BOOKING CANCELLED
         * =====================================================
         */
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
                                "BOOKING_CANCELLED",
                                event.getMessageId(),
                                "BOOKING_CANCELLED:" +
                                                event.getBookingId());

                String message = "Booking " +
                                safeText(
                                                event.getBookingCode(),
                                                event.getBookingId())
                                +
                                " đã được hủy.";

                if (event.getReason() != null &&
                                !event.getReason().isBlank()) {
                        message += " Lý do: " +
                                        event.getReason()
                                                        .trim();
                }

                return saveEventNotification(
                                eventKey,
                                event.getUserId(),
                                event.getBookingId(),
                                "Booking đã được hủy",
                                message,
                                "BOOKING_CANCELLED",
                                "/my-bookings?bookingId=" +
                                                event.getBookingId());
        }

        /*
         * =====================================================
         * RABBITMQ: PAYMENT SUCCESS
         * =====================================================
         */
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
                                "PAYMENT_SUCCESS",
                                event.getMessageId(),
                                "PAYMENT_SUCCESS:" +
                                                safeText(
                                                                event.getPaymentId(),
                                                                event.getBookingId()));

                String message = event.getMessage();

                if (message == null ||
                                message.isBlank()) {
                        message = "Thanh toán " +
                                        formatMoney(
                                                        event.getAmount())
                                        +
                                        " cho booking #" +
                                        event.getBookingId() +
                                        " đã thành công.";

                        if (event.getTransactionCode() != null &&
                                        !event.getTransactionCode()
                                                        .isBlank()) {
                                message += " Mã giao dịch: " +
                                                event.getTransactionCode()
                                                                .trim()
                                                +
                                                ".";
                        }
                }

                return saveEventNotification(
                                eventKey,
                                event.getUserId(),
                                event.getBookingId(),
                                "Thanh toán thành công",
                                message,
                                "PAYMENT_SUCCESS",
                                "/my-tickets?bookingId=" +
                                                event.getBookingId());
        }

        /*
         * =====================================================
         * RABBITMQ: PAYMENT FAILED
         * =====================================================
         */
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
                                "PAYMENT_FAILED",
                                event.getMessageId(),
                                "PAYMENT_FAILED:" +
                                                safeText(
                                                                event.getPaymentId(),
                                                                event.getBookingId()));

                String message = event.getMessage();

                if (message == null ||
                                message.isBlank()) {
                        message = "Thanh toán cho booking #" +
                                        event.getBookingId() +
                                        " chưa thành công. " +
                                        "Bạn có thể thử thanh toán lại.";
                }

                return saveEventNotification(
                                eventKey,
                                event.getUserId(),
                                event.getBookingId(),
                                "Thanh toán thất bại",
                                message,
                                "PAYMENT_FAILED",
                                "/my-bookings?bookingId=" +
                                                event.getBookingId());
        }

        /*
         * =====================================================
         * RABBITMQ: TICKET ISSUED
         * =====================================================
         */
        public Notification createFromTicketIssued(
                        TicketIssuedEvent event) {
                if (event == null ||
                                event.getTicketId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "ticket.issued event requires ticketId");
                }

                validateRabbitEvent(
                                event.getUserId(),
                                event.getBookingId(),
                                "ticket.issued");

                String eventKey = createEventKey(
                                "TICKET_ISSUED",
                                event.getMessageId(),
                                "TICKET_ISSUED:" +
                                                event.getTicketId());

                String message = "Vé " +
                                safeText(
                                                event.getTicketCode(),
                                                event.getTicketId())
                                +
                                " đã được phát hành.";

                if (event.getTicketType() != null &&
                                !event.getTicketType()
                                                .isBlank()) {
                        message += " Loại vé: " +
                                        event.getTicketType()
                                                        .trim()
                                        +
                                        ".";
                }

                return saveEventNotification(
                                eventKey,
                                event.getUserId(),
                                event.getBookingId(),
                                "Vé QR đã được phát hành",
                                message,
                                "TICKET_ISSUED",
                                "/my-tickets?bookingId=" +
                                                event.getBookingId());
        }

        /*
         * =====================================================
         * PRIVATE: LƯU NOTIFICATION TỪ EVENT
         * =====================================================
         */
        private Notification saveEventNotification(
                        String eventKey,
                        Long userId,
                        Long bookingId,
                        String title,
                        String message,
                        String type,
                        String actionUrl) {
                String normalizedEventKey = normalizeEventKey(
                                eventKey);

                Notification existing = notificationRepository
                                .findByEventKey(
                                                normalizedEventKey)
                                .orElse(null);

                if (existing != null) {
                        return existing;
                }

                Notification notification = new Notification();

                notification.setUserId(
                                userId);

                notification.setBookingId(
                                bookingId);

                notification.setTitle(
                                normalizeRequiredText(
                                                title,
                                                "title",
                                                MAX_TITLE_LENGTH));

                notification.setMessage(
                                normalizeRequiredText(
                                                message,
                                                "message",
                                                MAX_MESSAGE_LENGTH));

                notification.setType(
                                normalizeRequiredType(
                                                type));

                notification.setEventKey(
                                normalizedEventKey);

                notification.setActionUrl(
                                normalizeActionUrl(
                                                actionUrl));

                notification.setIsRead(false);
                notification.setReadAt(null);

                try {
                        return notificationRepository
                                        .saveAndFlush(
                                                        notification);
                } catch (DataIntegrityViolationException exception) {
                        return notificationRepository
                                        .findByEventKey(
                                                        normalizedEventKey)
                                        .orElseThrow(
                                                        () -> exception);
                }
        }

        private Notification findById(
                        Long id) {
                validateRequiredId(
                                id,
                                "notificationId");

                return notificationRepository
                                .findById(id)
                                .orElseThrow(
                                                () -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Notification not found: " +
                                                                                id));
        }

        private void validateRequiredFields(
                        Long userId,
                        String title,
                        String message) {
                validateRequiredId(
                                userId,
                                "userId");

                normalizeRequiredText(
                                title,
                                "title",
                                MAX_TITLE_LENGTH);

                normalizeRequiredText(
                                message,
                                "message",
                                MAX_MESSAGE_LENGTH);
        }

        private void validateRabbitEvent(
                        Long userId,
                        Long bookingId,
                        String eventName) {
                if (userId == null ||
                                userId < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        eventName +
                                                        " event requires a valid userId");
                }

                if (bookingId == null ||
                                bookingId < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        eventName +
                                                        " event requires a valid bookingId");
                }
        }

        private void validateRequiredId(
                        Long id,
                        String fieldName) {
                if (id == null ||
                                id < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        fieldName +
                                                        " must be greater than 0");
                }
        }

        private String createEventKey(
                        String eventType,
                        String messageId,
                        String fallback) {
                String value;

                if (messageId != null &&
                                !messageId.isBlank()) {
                        value = eventType +
                                        ":" +
                                        messageId.trim();
                } else {
                        value = fallback;
                }

                return normalizeEventKey(
                                value);
        }

        private String normalizeEventKey(
                        String eventKey) {
                if (eventKey == null ||
                                eventKey.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "eventKey is required");
                }

                String normalized = eventKey.trim();

                if (normalized.length() <= MAX_EVENT_KEY_LENGTH) {
                        return normalized;
                }

                UUID deterministicId = UUID.nameUUIDFromBytes(
                                normalized.getBytes(
                                                StandardCharsets.UTF_8));

                String prefix = normalized.contains(":")
                                ? normalized.substring(
                                                0,
                                                normalized.indexOf(":"))
                                : "EVENT";

                return prefix +
                                ":" +
                                deterministicId;
        }

        private String normalizeOptionalType(
                        String type) {
                if (type == null ||
                                type.isBlank() ||
                                "ALL".equalsIgnoreCase(
                                                type)) {
                        return null;
                }

                return normalizeRequiredType(
                                type);
        }

        private String normalizeRequiredType(
                        String type) {
                String normalized = type == null ||
                                type.isBlank()
                                                ? "SYSTEM"
                                                : type
                                                                .trim()
                                                                .toUpperCase(
                                                                                Locale.ROOT);

                if (!ALLOWED_TYPES.contains(
                                normalized)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid notification type: " +
                                                        type);
                }

                return normalized;
        }

        /*
         * Chỉ chính người nhận mới được thay đổi/xóa notification.
         * Không kiểm tra ADMIN trong hàm này.
         */
        private void requireNotificationOwner(
                        Long ownerUserId,
                        Long currentUserId) {
                if (currentUserId == null ||
                                currentUserId < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Missing user token");
                }

                if (ownerUserId == null ||
                                !ownerUserId.equals(
                                                currentUserId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Only the notification owner can change this notification");
                }
        }

        /*
         * Dùng cho thao tác chỉ đọc.
         *
         * ADMIN xem được toàn bộ.
         * USER chỉ xem được dữ liệu của mình.
         */
        private void checkOwnerOrAdmin(
                        Long ownerUserId,
                        Long currentUserId,
                        String role) {
                if (isAdmin(role)) {
                        return;
                }

                if (currentUserId == null ||
                                currentUserId < 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Missing user token");
                }

                if (ownerUserId == null ||
                                !ownerUserId.equals(
                                                currentUserId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "You cannot access another user's notification");
                }
        }

        private Long requireCurrentUserId(
                        Long currentUserId) {
                if (currentUserId == null ||
                                currentUserId < 1) {
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
                if (role == null ||
                                role.isBlank()) {
                        return false;
                }

                String normalized = role.trim()
                                .toUpperCase(
                                                Locale.ROOT);

                return "ADMIN".equals(
                                normalized) ||
                                "ROLE_ADMIN".equals(
                                                normalized);
        }

        private void validatePage(
                        int page,
                        int size) {
                if (page < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "page must be greater than or equal to 0");
                }

                if (size < 1 ||
                                size > 100) {
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

        private void validateDateRange(
                        LocalDateTime fromDate,
                        LocalDateTime toDate) {
                if (fromDate != null &&
                                toDate != null &&
                                fromDate.isAfter(
                                                toDate)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "fromDate must be before or equal to toDate");
                }
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

        private String normalizeRequiredText(
                        String value,
                        String fieldName,
                        int maxLength) {
                if (value == null ||
                                value.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        fieldName +
                                                        " is required");
                }

                String normalized = value.trim();

                if (normalized.length() > maxLength) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        fieldName +
                                                        " must not exceed " +
                                                        maxLength +
                                                        " characters");
                }

                return normalized;
        }

        private String normalizeActionUrl(
                        String actionUrl) {
                String normalized = normalizeNullableText(
                                actionUrl);

                if (normalized == null) {
                        return null;
                }

                if (normalized.length() > MAX_ACTION_URL_LENGTH) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "actionUrl must not exceed " +
                                                        MAX_ACTION_URL_LENGTH +
                                                        " characters");
                }

                if (!normalized.startsWith("/") ||
                                normalized.startsWith("//")) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "actionUrl must be an internal path starting with /");
                }

                return normalized;
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

                return formatter.format(
                                amount) + " đ";
        }

        private String safeText(
                        Object value,
                        Object fallback) {
                if (value == null ||
                                String.valueOf(value)
                                                .isBlank()) {
                        return String.valueOf(
                                        fallback);
                }

                return String.valueOf(
                                value);
        }
}