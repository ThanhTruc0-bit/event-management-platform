package com.example.payment_service.service;

import com.example.payment_service.dto.BookingDTO;
import com.example.payment_service.entity.Payment;
import com.example.payment_service.feign.BookingClient;
import com.example.payment_service.repository.PaymentRepository;
import com.example.payment_service.util.VnpayUtil;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class PaymentService {

        private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

        private static final String INTERNAL_ROLE = "ADMIN";

        private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of(
                        "VNPAY",
                        "MOMO",
                        "CASH",
                        "BANKING",
                        "DEMO_QR");

        private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
                        "id",
                        "bookingId",
                        "amount",
                        "paymentMethod",
                        "status",
                        "transactionCode",
                        "vnpTransactionNo",
                        "vnpBankCode",
                        "paymentDate",
                        "createdAt",
                        "updatedAt",
                        "syncStatus",
                        "syncAttempts",
                        "nextSyncAt",
                        "syncedAt");

        private final PaymentRepository paymentRepository;

        private final BookingClient bookingClient;

        @Value("${vnpay.tmn-code}")
        private String vnpTmnCode;

        @Value("${vnpay.hash-secret}")
        private String vnpHashSecret;

        @Value("${vnpay.pay-url}")
        private String vnpPayUrl;

        @Value("${vnpay.return-url}")
        private String vnpReturnUrl;

        @Value("${vnpay.frontend-return-url}")
        private String frontendReturnUrl;

        @Value("${payment.sync.max-attempts:100}")
        private int syncMaxAttempts;

        @Value("${payment.sync.retry-delay-seconds:15}")
        private long syncRetryDelaySeconds;

        @Value("${payment.sync.batch-size:50}")
        private int syncBatchSize;

        public Page<Payment> getPayments(
                        int page,
                        int size,
                        String keyword,
                        Long bookingId,
                        String status,
                        String paymentMethod,
                        LocalDateTime fromDate,
                        LocalDateTime toDate,
                        String sortBy,
                        String sortDirection) {
                int safePage = Math.max(
                                page,
                                0);

                int safeSize = Math.min(
                                Math.max(
                                                size,
                                                1),
                                100);

                String safeSortBy = ALLOWED_SORT_FIELDS.contains(
                                sortBy)
                                                ? sortBy
                                                : "createdAt";

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

                Specification<Payment> specification = Specification.where(
                                null);

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
                                                                                                root.get(
                                                                                                                "transactionCode")),
                                                                                likeValue));

                                                predicates.add(
                                                                criteriaBuilder.like(
                                                                                criteriaBuilder.lower(
                                                                                                root.get(
                                                                                                                "vnpTransactionNo")),
                                                                                likeValue));

                                                predicates.add(
                                                                criteriaBuilder.like(
                                                                                criteriaBuilder.lower(
                                                                                                root.get(
                                                                                                                "vnpResponseCode")),
                                                                                likeValue));

                                                predicates.add(
                                                                criteriaBuilder.like(
                                                                                criteriaBuilder.lower(
                                                                                                root.get(
                                                                                                                "vnpBankCode")),
                                                                                likeValue));

                                                predicates.add(
                                                                criteriaBuilder.like(
                                                                                criteriaBuilder.lower(
                                                                                                root.get(
                                                                                                                "paymentMethod")),
                                                                                likeValue));

                                                predicates.add(
                                                                criteriaBuilder.like(
                                                                                criteriaBuilder.lower(
                                                                                                root.get(
                                                                                                                "status")),
                                                                                likeValue));

                                                try {
                                                        Long number = Long.valueOf(
                                                                        searchValue);

                                                        predicates.add(
                                                                        criteriaBuilder.equal(
                                                                                        root.get(
                                                                                                        "id"),
                                                                                        number));

                                                        predicates.add(
                                                                        criteriaBuilder.equal(
                                                                                        root.get(
                                                                                                        "bookingId"),
                                                                                        number));
                                                } catch (NumberFormatException ignored) {
                                                        // Không phải số.
                                                }

                                                return criteriaBuilder.or(
                                                                predicates.toArray(
                                                                                new Predicate[0]));
                                        });
                }

                if (bookingId != null) {
                        specification = specification.and(
                                        (
                                                        root,
                                                        query,
                                                        criteriaBuilder) -> criteriaBuilder.equal(
                                                                        root.get(
                                                                                        "bookingId"),
                                                                        bookingId));
                }

                if (status != null &&
                                !status.isBlank()) {
                        String normalizedStatus = normalizeStatus(
                                        status);

                        specification = specification.and(
                                        (
                                                        root,
                                                        query,
                                                        criteriaBuilder) -> criteriaBuilder.equal(
                                                                        criteriaBuilder.upper(
                                                                                        root.get(
                                                                                                        "status")),
                                                                        normalizedStatus));
                }

                if (paymentMethod != null &&
                                !paymentMethod.isBlank()) {
                        String normalizedMethod = normalizePaymentMethod(
                                        paymentMethod);

                        specification = specification.and(
                                        (
                                                        root,
                                                        query,
                                                        criteriaBuilder) -> criteriaBuilder.equal(
                                                                        criteriaBuilder.upper(
                                                                                        root.get(
                                                                                                        "paymentMethod")),
                                                                        normalizedMethod));
                }

                if (fromDate != null) {
                        specification = specification.and(
                                        (
                                                        root,
                                                        query,
                                                        criteriaBuilder) -> criteriaBuilder
                                                                        .greaterThanOrEqualTo(
                                                                                        root.get(
                                                                                                        "createdAt"),
                                                                                        fromDate));
                }

                if (toDate != null) {
                        specification = specification.and(
                                        (
                                                        root,
                                                        query,
                                                        criteriaBuilder) -> criteriaBuilder
                                                                        .lessThanOrEqualTo(
                                                                                        root.get(
                                                                                                        "createdAt"),
                                                                                        toDate));
                }

                return paymentRepository.findAll(
                                specification,
                                pageable);
        }

        public Payment getPaymentById(
                        Long id) {
                return paymentRepository
                                .findById(
                                                id)
                                .orElseThrow(
                                                () -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Payment not found: "
                                                                                + id));
        }

        public List<Payment> getPaymentsByBooking(
                        Long bookingId) {
                return paymentRepository
                                .findByBookingIdOrderByCreatedAtDesc(
                                                bookingId);
        }

        public Payment createPayment(
                        Payment payment) {
                if (payment == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Payment request is required");
                }

                if (payment.getBookingId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "bookingId is required");
                }

                BookingDTO booking = getBooking(
                                payment.getBookingId());

                String bookingStatus = normalizeStatus(
                                booking.getStatus());

                if (!"PENDING".equals(
                                bookingStatus)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Only PENDING booking can create payment. Current status: "
                                                        + booking.getStatus());
                }

                if (paymentRepository
                                .existsByBookingIdAndStatusIgnoreCase(
                                                payment.getBookingId(),
                                                "SUCCESS")) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Booking has already been paid");
                }

                if (booking.getTotalAmount() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Booking total amount is null");
                }

                if (payment.getAmount() == null) {
                        payment.setAmount(
                                        booking.getTotalAmount());
                }

                if (Double.compare(
                                payment.getAmount(),
                                booking.getTotalAmount()) != 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Payment amount does not match booking total amount");
                }

                payment.setPaymentMethod(
                                normalizePaymentMethod(
                                                payment.getPaymentMethod()));

                payment.setStatus(
                                "PENDING");

                payment.setPaymentDate(
                                null);

                payment.setVnpResponseCode(
                                null);

                payment.setVnpTransactionNo(
                                null);

                payment.setVnpBankCode(
                                null);

                markSynchronizationNotRequired(
                                payment);

                if (payment.getTransactionCode() == null ||
                                payment.getTransactionCode()
                                                .isBlank()) {
                        payment.setTransactionCode(
                                        generateTransactionCode(
                                                        payment.getBookingId()));
                }

                return paymentRepository.save(
                                payment);
        }

        public Payment createVnpayPaymentForBooking(
                        Long bookingId,
                        String bankCode,
                        HttpServletRequest request) {
                BookingDTO booking = getBooking(
                                bookingId);

                if (!"PENDING".equalsIgnoreCase(
                                booking.getStatus())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Booking is not available for payment. Current status: "
                                                        + booking.getStatus());
                }

                if (paymentRepository
                                .existsByBookingIdAndStatusIgnoreCase(
                                                bookingId,
                                                "SUCCESS")) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Booking has already been paid");
                }

                closeOldPendingAttempts(
                                bookingId);

                Payment payment = new Payment();

                payment.setBookingId(
                                bookingId);

                payment.setPaymentMethod(
                                "VNPAY");

                Payment savedPayment = createPayment(
                                payment);

                String paymentUrl = buildVnpayPaymentUrl(
                                savedPayment,
                                bankCode,
                                request);

                savedPayment.setPaymentUrl(
                                paymentUrl);

                savedPayment.setQrContent(
                                "VNPAY_PAYMENT_URL:"
                                                + paymentUrl);

                return paymentRepository.save(
                                savedPayment);
        }

        public Payment handleVnpayReturn(
                        Map<String, String> params) {
                if (params == null ||
                                params.isEmpty()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "VNPay return parameters are empty");
                }

                if (!verifyVnpaySignature(
                                params)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid VNPay signature");
                }

                String transactionCode = params.get(
                                "vnp_TxnRef");

                if (transactionCode == null ||
                                transactionCode.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Missing vnp_TxnRef");
                }

                Payment payment = paymentRepository
                                .findByTransactionCode(
                                                transactionCode)
                                .orElseThrow(
                                                () -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Payment not found by transactionCode: "
                                                                                + transactionCode));

                /*
                 * Nếu callback chạy lại khi payment đã SUCCESS,
                 * tiếp tục kiểm tra booking đã PAID chưa.
                 */
                if ("SUCCESS".equalsIgnoreCase(
                                payment.getStatus())) {
                        return synchronizeSuccessfulPayment(
                                        payment,
                                        false);
                }

                validateReturnedAmount(
                                payment,
                                params.get(
                                                "vnp_Amount"));

                String responseCode = params.get(
                                "vnp_ResponseCode");

                String transactionStatus = params.get(
                                "vnp_TransactionStatus");

                payment.setVnpResponseCode(
                                responseCode);

                payment.setVnpTransactionNo(
                                params.get(
                                                "vnp_TransactionNo"));

                payment.setVnpBankCode(
                                params.get(
                                                "vnp_BankCode"));

                payment.setPaymentDate(
                                LocalDateTime.now());

                boolean successful = "00".equals(
                                responseCode) &&
                                "00".equals(
                                                transactionStatus);

                if (successful) {
                        return processSuccessfulPayment(
                                        payment);
                }

                return processFailedPayment(
                                payment);
        }

        public Payment confirmPaymentSuccess(
                        Long id) {
                Payment payment = getPaymentById(
                                id);

                if ("SUCCESS".equalsIgnoreCase(
                                payment.getStatus())) {
                        return synchronizeSuccessfulPayment(
                                        payment,
                                        false);
                }

                BookingDTO booking = getBooking(
                                payment.getBookingId());

                String bookingStatus = normalizeStatus(
                                booking.getStatus());

                if (!"PENDING".equals(
                                bookingStatus) &&
                                !"PAID".equals(
                                                bookingStatus)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Only PENDING booking can be paid. Current status: "
                                                        + booking.getStatus());
                }

                payment.setStatus(
                                "SUCCESS");

                payment.setPaymentDate(
                                LocalDateTime.now());

                prepareSynchronization(
                                payment);

                Payment savedPayment = paymentRepository.save(
                                payment);

                return synchronizeSuccessfulPayment(
                                savedPayment,
                                false);
        }

        public Payment retryBookingSynchronization(
                        Long paymentId) {
                Payment payment = getPaymentById(
                                paymentId);

                if (!"SUCCESS".equalsIgnoreCase(
                                payment.getStatus())) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Only SUCCESS payment can retry booking synchronization");
                }

                payment.setSyncStatus(
                                "PENDING");
                payment.setSyncAttempts(
                                0);
                payment.setNextSyncAt(
                                LocalDateTime.now());
                payment.setLastSyncError(
                                null);

                Payment savedPayment = paymentRepository.save(
                                payment);

                return synchronizeSuccessfulPayment(
                                savedPayment,
                                true);
        }

        public int synchronizePendingPayments() {
                int safeBatchSize = Math.min(
                                Math.max(syncBatchSize, 1),
                                200);

                List<Payment> candidates = paymentRepository
                                .findPaymentsNeedingSynchronization(
                                                LocalDateTime.now(),
                                                PageRequest.of(
                                                                0,
                                                                safeBatchSize));

                int synchronizedCount = 0;

                for (Payment payment : candidates) {
                        Payment result = synchronizeSuccessfulPayment(
                                        payment,
                                        false);

                        if ("SYNCED".equalsIgnoreCase(
                                        result.getSyncStatus())) {
                                synchronizedCount++;
                        }
                }

                return synchronizedCount;
        }

        public Payment markPaymentFailed(
                        Long id) {
                Payment payment = getPaymentById(
                                id);

                if ("SUCCESS".equalsIgnoreCase(
                                payment.getStatus())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "SUCCESS payment cannot be marked as FAILED");
                }

                payment.setStatus(
                                "FAILED");

                payment.setPaymentDate(
                                LocalDateTime.now());

                markSynchronizationNotRequired(
                                payment);

                return paymentRepository.save(
                                payment);
        }

        public Payment updatePayment(
                        Long id,
                        Payment request) {
                Payment payment = getPaymentById(
                                id);

                if (request == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Payment body is required");
                }

                if (request.getPaymentMethod() != null &&
                                !request.getPaymentMethod()
                                                .isBlank()) {
                        payment.setPaymentMethod(
                                        normalizePaymentMethod(
                                                        request.getPaymentMethod()));
                }

                if (request.getStatus() == null ||
                                request.getStatus()
                                                .isBlank()) {
                        return paymentRepository.save(
                                        payment);
                }

                String newStatus = normalizeStatus(
                                request.getStatus());

                if ("SUCCESS".equals(
                                newStatus)) {
                        paymentRepository.save(
                                        payment);

                        return confirmPaymentSuccess(
                                        id);
                }

                if ("FAILED".equals(
                                newStatus)) {
                        paymentRepository.save(
                                        payment);

                        return markPaymentFailed(
                                        id);
                }

                if ("PENDING".equals(
                                newStatus)) {
                        if ("SUCCESS".equalsIgnoreCase(
                                        payment.getStatus())) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "SUCCESS payment cannot return to PENDING");
                        }

                        payment.setStatus(
                                        "PENDING");

                        payment.setPaymentDate(
                                        null);

                        markSynchronizationNotRequired(
                                        payment);

                        return paymentRepository.save(
                                        payment);
                }

                throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Invalid payment status: "
                                                + request.getStatus());
        }

        public void deletePayment(
                        Long id) {
                Payment payment = getPaymentById(
                                id);

                if ("SUCCESS".equalsIgnoreCase(
                                payment.getStatus())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "SUCCESS payment cannot be deleted");
                }

                paymentRepository.delete(
                                payment);
        }

        public String buildFrontendRedirectUrl(
                        Payment payment) {
                return frontendReturnUrl.trim()
                                + "?paymentId="
                                + payment.getId()
                                + "&bookingId="
                                + payment.getBookingId()
                                + "&status="
                                + payment.getStatus();
        }

        public String buildFrontendErrorUrl(
                        String message) {
                String safeMessage = message == null
                                ? "Payment processing failed"
                                : message;

                return frontendReturnUrl.trim()
                                + "?status=FAILED"
                                + "&message="
                                + VnpayUtil.urlEncode(
                                                safeMessage);
        }

        private Payment processSuccessfulPayment(
                        Payment payment) {
                /*
                 * VNPay trả mã 00 thì giao dịch đã thành công.
                 * Trạng thái SUCCESS phải được lưu độc lập với
                 * việc Booking/Ticket Service có đang hoạt động hay không.
                 */
                payment.setStatus(
                                "SUCCESS");

                if (payment.getPaymentDate() == null) {
                        payment.setPaymentDate(
                                        LocalDateTime.now());
                }

                prepareSynchronization(
                                payment);

                Payment savedPayment = paymentRepository.save(
                                payment);

                /*
                 * Thử đồng bộ ngay một lần. Nếu thất bại,
                 * trạng thái RETRY được lưu lại và scheduler
                 * sẽ tự gọi lại, không cần người dùng bấm nút.
                 */
                return synchronizeSuccessfulPayment(
                                savedPayment,
                                false);
        }

        private Payment processFailedPayment(
                        Payment payment) {
                payment.setStatus(
                                "FAILED");

                markSynchronizationNotRequired(
                                payment);

                return paymentRepository.save(
                                payment);
        }

        private void closeOldPendingAttempts(
                        Long bookingId) {
                List<Payment> pendingPayments = paymentRepository
                                .findByBookingIdAndStatusIgnoreCase(
                                                bookingId,
                                                "PENDING");

                if (pendingPayments.isEmpty()) {
                        return;
                }

                LocalDateTime now = LocalDateTime.now();

                for (Payment pendingPayment : pendingPayments) {
                        pendingPayment.setStatus(
                                        "FAILED");

                        pendingPayment.setPaymentDate(
                                        now);

                        markSynchronizationNotRequired(
                                        pendingPayment);
                }

                paymentRepository.saveAll(
                                pendingPayments);
        }

        private synchronized Payment synchronizeSuccessfulPayment(
                        Payment payment,
                        boolean throwOnFailure) {
                if (payment == null ||
                                payment.getId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Payment is required for synchronization");
                }

                Payment currentPayment = getPaymentById(
                                payment.getId());

                if (!"SUCCESS".equalsIgnoreCase(
                                currentPayment.getStatus())) {
                        markSynchronizationNotRequired(
                                        currentPayment);

                        return paymentRepository.save(
                                        currentPayment);
                }

                if ("SYNCED".equalsIgnoreCase(
                                currentPayment.getSyncStatus())) {
                        return currentPayment;
                }

                int currentAttempts = currentPayment.getSyncAttempts() == null
                                ? 0
                                : currentPayment.getSyncAttempts();

                int nextAttempt = currentAttempts + 1;

                currentPayment.setSyncStatus(
                                "PENDING");
                currentPayment.setSyncAttempts(
                                nextAttempt);
                currentPayment.setNextSyncAt(
                                null);

                currentPayment = paymentRepository.save(
                                currentPayment);

                try {
                        ensureBookingPaid(
                                        currentPayment);

                        currentPayment.setSyncStatus(
                                        "SYNCED");
                        currentPayment.setNextSyncAt(
                                        null);
                        currentPayment.setLastSyncError(
                                        null);
                        currentPayment.setSyncedAt(
                                        LocalDateTime.now());

                        Payment synchronizedPayment = paymentRepository.save(
                                        currentPayment);

                        log.info(
                                        "Payment {} synchronized successfully with booking {} after {} attempt(s)",
                                        synchronizedPayment.getId(),
                                        synchronizedPayment.getBookingId(),
                                        synchronizedPayment.getSyncAttempts());

                        return synchronizedPayment;
                } catch (Exception exception) {
                        String errorMessage = safeExceptionMessage(
                                        exception);

                        boolean reachedMaximumAttempts = nextAttempt >= Math.max(
                                        syncMaxAttempts,
                                        1);

                        currentPayment.setSyncStatus(
                                        reachedMaximumAttempts
                                                        ? "FAILED"
                                                        : "RETRY");
                        currentPayment.setLastSyncError(
                                        truncate(
                                                        errorMessage,
                                                        3000));
                        currentPayment.setSyncedAt(
                                        null);
                        currentPayment.setNextSyncAt(
                                        reachedMaximumAttempts
                                                        ? null
                                                        : LocalDateTime.now()
                                                                        .plusSeconds(
                                                                                        Math.max(
                                                                                                        syncRetryDelaySeconds,
                                                                                                        1)));

                        Payment failedSynchronization = paymentRepository.save(
                                        currentPayment);

                        log.error(
                                        "Payment {} succeeded but booking {} synchronization attempt {} failed: {}",
                                        failedSynchronization.getId(),
                                        failedSynchronization.getBookingId(),
                                        nextAttempt,
                                        errorMessage,
                                        exception);

                        if (throwOnFailure) {
                                throw new ResponseStatusException(
                                                HttpStatus.SERVICE_UNAVAILABLE,
                                                "Payment succeeded but booking/ticket synchronization failed: "
                                                                + errorMessage,
                                                exception);
                        }

                        return failedSynchronization;
                }
        }

        private void prepareSynchronization(
                        Payment payment) {
                if (payment == null) {
                        return;
                }

                if ("SYNCED".equalsIgnoreCase(
                                payment.getSyncStatus())) {
                        return;
                }

                payment.setSyncStatus(
                                "PENDING");

                if (payment.getSyncAttempts() == null) {
                        payment.setSyncAttempts(
                                        0);
                }

                payment.setNextSyncAt(
                                LocalDateTime.now());
                payment.setLastSyncError(
                                null);
                payment.setSyncedAt(
                                null);
        }

        private void markSynchronizationNotRequired(
                        Payment payment) {
                if (payment == null) {
                        return;
                }

                payment.setSyncStatus(
                                "NOT_REQUIRED");
                payment.setSyncAttempts(
                                0);
                payment.setNextSyncAt(
                                null);
                payment.setLastSyncError(
                                null);
                payment.setSyncedAt(
                                null);
        }

        private String truncate(
                        String value,
                        int maxLength) {
                if (value == null ||
                                value.length() <= maxLength) {
                        return value;
                }

                return value.substring(
                                0,
                                maxLength);
        }

        private void ensureBookingPaid(
                        Payment payment) {
                if (payment == null ||
                                payment.getBookingId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Payment bookingId is required");
                }

                BookingDTO booking = getBooking(
                                payment.getBookingId());

                String bookingStatus = normalizeStatus(
                                booking.getStatus());

                if ("PAID".equals(
                                bookingStatus)) {
                        return;
                }

                if (!"PENDING".equals(
                                bookingStatus)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Payment is SUCCESS but booking cannot change to PAID. Current booking status: "
                                                        + bookingStatus);
                }

                try {
                        BookingDTO updatedBooking = bookingClient
                                        .updateBookingStatus(
                                                        payment.getBookingId(),
                                                        "PAID",
                                                        INTERNAL_ROLE);

                        if (updatedBooking == null ||
                                        !"PAID".equals(
                                                        normalizeStatus(
                                                                        updatedBooking.getStatus()))) {
                                throw new ResponseStatusException(
                                                HttpStatus.SERVICE_UNAVAILABLE,
                                                "Booking Service did not return PAID status");
                        }
                } catch (ResponseStatusException exception) {
                        throw exception;
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Payment succeeded but booking/ticket synchronization failed: "
                                                        + safeExceptionMessage(
                                                                        exception),
                                        exception);
                }
        }

        private String safeExceptionMessage(
                        Exception exception) {
                if (exception == null) {
                        return "Unknown error";
                }

                String message = exception.getMessage();

                return message == null ||
                                message.isBlank()
                                                ? exception.getClass()
                                                                .getSimpleName()
                                                : message;
        }

        private String buildVnpayPaymentUrl(
                        Payment payment,
                        String bankCode,
                        HttpServletRequest request) {
                BookingDTO booking = getBooking(
                                payment.getBookingId());

                ZoneId zoneId = ZoneId.of(
                                "Asia/Ho_Chi_Minh");

                LocalDateTime now = LocalDateTime.now(
                                zoneId);

                LocalDateTime expire = now.plusMinutes(
                                15);

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(
                                "yyyyMMddHHmmss");

                long vnpAmount = Math.round(
                                payment.getAmount()
                                                * 100);

                Map<String, String> vnpParams = new TreeMap<>();

                vnpParams.put(
                                "vnp_Version",
                                "2.1.0");

                vnpParams.put(
                                "vnp_Command",
                                "pay");

                vnpParams.put(
                                "vnp_TmnCode",
                                vnpTmnCode.trim());

                vnpParams.put(
                                "vnp_Amount",
                                String.valueOf(
                                                vnpAmount));

                vnpParams.put(
                                "vnp_CurrCode",
                                "VND");

                vnpParams.put(
                                "vnp_TxnRef",
                                payment.getTransactionCode());

                vnpParams.put(
                                "vnp_OrderInfo",
                                "Thanh toan booking "
                                                + booking.getBookingCode());

                vnpParams.put(
                                "vnp_OrderType",
                                "other");

                vnpParams.put(
                                "vnp_Locale",
                                "vn");

                vnpParams.put(
                                "vnp_ReturnUrl",
                                vnpReturnUrl.trim());

                vnpParams.put(
                                "vnp_IpAddr",
                                VnpayUtil.getIpAddress(
                                                request));

                vnpParams.put(
                                "vnp_CreateDate",
                                now.format(
                                                formatter));

                vnpParams.put(
                                "vnp_ExpireDate",
                                expire.format(
                                                formatter));

                if (bankCode != null &&
                                !bankCode.isBlank()) {
                        vnpParams.put(
                                        "vnp_BankCode",
                                        bankCode.trim());
                }

                String hashData = VnpayUtil.buildHashData(
                                vnpParams);

                String queryString = VnpayUtil.buildQueryString(
                                vnpParams);

                String secureHash = VnpayUtil.hmacSHA512(
                                vnpHashSecret.trim(),
                                hashData);

                return vnpPayUrl.trim()
                                + "?"
                                + queryString
                                + "&vnp_SecureHash="
                                + secureHash;
        }

        private boolean verifyVnpaySignature(
                        Map<String, String> params) {
                String vnpSecureHash = params.get(
                                "vnp_SecureHash");

                if (vnpSecureHash == null ||
                                vnpSecureHash.isBlank()) {
                        return false;
                }

                Map<String, String> verifyParams = new HashMap<>();

                for (Map.Entry<String, String> entry : params.entrySet()) {
                        String key = entry.getKey();

                        if (key == null ||
                                        !key.startsWith(
                                                        "vnp_")) {
                                continue;
                        }

                        if ("vnp_SecureHash".equals(
                                        key) ||
                                        "vnp_SecureHashType".equals(
                                                        key)) {
                                continue;
                        }

                        verifyParams.put(
                                        key,
                                        entry.getValue());
                }

                String hashData = VnpayUtil.buildHashData(
                                verifyParams);

                String calculatedHash = VnpayUtil.hmacSHA512(
                                vnpHashSecret.trim(),
                                hashData);

                return calculatedHash
                                .equalsIgnoreCase(
                                                vnpSecureHash);
        }

        private void validateReturnedAmount(
                        Payment payment,
                        String returnedAmount) {
                if (returnedAmount == null ||
                                returnedAmount.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Missing vnp_Amount");
                }

                try {
                        long actualAmount = Long.parseLong(
                                        returnedAmount);

                        long expectedAmount = Math.round(
                                        payment.getAmount()
                                                        * 100);

                        if (actualAmount != expectedAmount) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "VNPay amount does not match payment amount");
                        }
                } catch (NumberFormatException exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid vnp_Amount");
                }
        }

        private BookingDTO getBooking(
                        Long bookingId) {
                try {
                        BookingDTO booking = bookingClient
                                        .getBookingById(
                                                        bookingId,
                                                        INTERNAL_ROLE);

                        if (booking == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Booking not found: "
                                                                + bookingId);
                        }

                        return booking;
                } catch (ResponseStatusException exception) {
                        throw exception;
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Cannot get booking: "
                                                        + bookingId);
                }
        }

        private String generateTransactionCode(
                        Long bookingId) {
                return "PAY"
                                + bookingId
                                + System.currentTimeMillis();
        }

        private String normalizeStatus(
                        String status) {
                return String.valueOf(
                                status == null
                                                ? ""
                                                : status)
                                .trim()
                                .toUpperCase();
        }

        private String normalizePaymentMethod(
                        String paymentMethod) {
                String normalized = paymentMethod == null ||
                                paymentMethod.isBlank()
                                                ? "VNPAY"
                                                : paymentMethod
                                                                .trim()
                                                                .toUpperCase();

                if (!ALLOWED_PAYMENT_METHODS
                                .contains(
                                                normalized)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid payment method: "
                                                        + paymentMethod);
                }

                return normalized;
        }
}