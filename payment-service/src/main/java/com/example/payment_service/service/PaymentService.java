package com.example.payment_service.service;

import com.example.payment_service.dto.BookingDTO;
import com.example.payment_service.entity.Payment;
import com.example.payment_service.feign.BookingClient;
import com.example.payment_service.repository.PaymentRepository;
import com.example.payment_service.util.VnpayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final String INTERNAL_ROLE = "ADMIN";

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

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public Payment getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Payment not found: " + id));
    }

    public List<Payment> getPaymentsByBooking(
            Long bookingId) {
        return paymentRepository.findByBookingId(
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

        if (!"PENDING".equalsIgnoreCase(
                booking.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PENDING booking can create payment. "
                            + "Current status: "
                            + booking.getStatus());
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
                    "Payment amount does not match "
                            + "booking total amount");
        }

        if (payment.getPaymentMethod() == null
                || payment.getPaymentMethod().isBlank()) {
            payment.setPaymentMethod("VNPAY");
        }

        payment.setStatus("PENDING");
        payment.setPaymentDate(null);

        if (payment.getTransactionCode() == null
                || payment.getTransactionCode().isBlank()) {
            payment.setTransactionCode(
                    generateTransactionCode(
                            payment.getBookingId()));
        }

        return paymentRepository.save(payment);
    }

    public Payment createVnpayPaymentForBooking(
            Long bookingId,
            String bankCode,
            HttpServletRequest request) {
        Payment payment = new Payment();

        payment.setBookingId(bookingId);
        payment.setPaymentMethod("VNPAY");

        Payment savedPayment = createPayment(payment);

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
        if (params == null || params.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "VNPay return parameters are empty");
        }

        boolean validSignature = verifyVnpaySignature(params);

        if (!validSignature) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid VNPay signature");
        }

        String transactionCode = params.get("vnp_TxnRef");

        String responseCode = params.get("vnp_ResponseCode");

        String transactionStatus = params.get(
                "vnp_TransactionStatus");

        String transactionNo = params.get(
                "vnp_TransactionNo");

        String bankCode = params.get("vnp_BankCode");

        if (transactionCode == null
                || transactionCode.isBlank()) {
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
         * Callback có thể bị gọi lại khi người dùng
         * refresh trang hoặc VNPay gửi lại kết quả.
         *
         * Payment đã SUCCESS thì không xử lý booking lần nữa,
         * tránh phát hành ticket QR trùng.
         */
        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {
            return payment;
        }

        payment.setVnpResponseCode(
                responseCode);

        payment.setVnpTransactionNo(
                transactionNo);

        payment.setVnpBankCode(
                bankCode);

        payment.setPaymentDate(
                LocalDateTime.now());

        boolean successful = "00".equals(responseCode)
                && "00".equals(
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
        Payment payment = getPaymentById(id);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {
            return payment;
        }

        BookingDTO booking = getBooking(
                payment.getBookingId());

        String bookingStatus = normalizeStatus(
                booking.getStatus());

        if (!"PENDING".equals(bookingStatus)
                && !"PAID".equals(bookingStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PENDING booking can be paid. "
                            + "Current status: "
                            + booking.getStatus());
        }

        payment.setStatus("SUCCESS");
        payment.setPaymentDate(
                LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        if (!"PAID".equals(bookingStatus)) {
            updateBookingToPaid(
                    savedPayment.getBookingId());
        }

        return savedPayment;
    }

    public Payment markPaymentFailed(
            Long id) {
        Payment payment = getPaymentById(id);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "SUCCESS payment cannot be marked as FAILED");
        }

        payment.setStatus("FAILED");
        payment.setPaymentDate(
                LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        expirePendingBooking(
                savedPayment.getBookingId());

        return savedPayment;
    }

    public Payment updatePayment(
            Long id,
            Payment payment) {
        Payment oldPayment = getPaymentById(id);

        if (payment == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment body is required");
        }

        if (payment.getPaymentMethod() != null
                && !payment.getPaymentMethod().isBlank()) {
            oldPayment.setPaymentMethod(
                    payment.getPaymentMethod()
                            .trim()
                            .toUpperCase());
        }

        if (payment.getStatus() == null
                || payment.getStatus().isBlank()) {
            return paymentRepository.save(
                    oldPayment);
        }

        String newStatus = payment.getStatus()
                .trim()
                .toUpperCase();

        if ("SUCCESS".equals(newStatus)) {
            paymentRepository.save(
                    oldPayment);

            return confirmPaymentSuccess(id);
        }

        if ("FAILED".equals(newStatus)) {
            paymentRepository.save(
                    oldPayment);

            return markPaymentFailed(id);
        }

        if ("PENDING".equals(newStatus)) {
            if ("SUCCESS".equalsIgnoreCase(
                    oldPayment.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "SUCCESS payment cannot return to PENDING");
            }

            oldPayment.setStatus("PENDING");
            oldPayment.setPaymentDate(null);

            return paymentRepository.save(
                    oldPayment);
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid payment status: "
                        + payment.getStatus());
    }

    public void deletePayment(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Payment not found: " + id);
        }

        paymentRepository.deleteById(id);
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
        payment.setStatus("SUCCESS");

        Payment savedPayment = paymentRepository.save(payment);

        try {
            BookingDTO booking = getBooking(
                    savedPayment.getBookingId());

            if (!"PAID".equalsIgnoreCase(
                    booking.getStatus())) {
                updateBookingToPaid(
                        savedPayment.getBookingId());
            }
        } catch (Exception exception) {
            /*
             * VNPay đã xác nhận giao dịch thành công,
             * vì vậy Payment vẫn phải giữ SUCCESS.
             *
             * Lỗi đồng bộ Booking được ghi log để xử lý lại.
             */
            System.out.println(
                    "Payment SUCCESS but cannot update booking PAID. "
                            + "bookingId="
                            + savedPayment.getBookingId()
                            + ", error="
                            + exception.getMessage());
        }

        return savedPayment;
    }

    private Payment processFailedPayment(
            Payment payment) {
        payment.setStatus("FAILED");

        Payment savedPayment = paymentRepository.save(payment);

        /*
         * Thanh toán thất bại:
         *
         * Booking -> EXPIRED
         * Seat RESERVED -> AVAILABLE
         *
         * Việc trả ghế được Booking Service thực hiện
         * trong updateBookingStatus.
         */
        expirePendingBooking(
                savedPayment.getBookingId());

        return savedPayment;
    }

    private void updateBookingToPaid(
            Long bookingId) {
        bookingClient.updateBookingStatus(
                bookingId,
                "PAID",
                INTERNAL_ROLE);
    }

    private void expirePendingBooking(
            Long bookingId) {
        try {
            BookingDTO booking = getBooking(bookingId);

            if ("PENDING".equalsIgnoreCase(
                    booking.getStatus())) {
                bookingClient.updateBookingStatus(
                        bookingId,
                        "EXPIRED",
                        INTERNAL_ROLE);
            }
        } catch (Exception exception) {
            System.out.println(
                    "Cannot expire booking after payment failed. "
                            + "bookingId="
                            + bookingId
                            + ", error="
                            + exception.getMessage());
        }
    }

    private String buildVnpayPaymentUrl(
            Payment payment,
            String bankCode,
            HttpServletRequest request) {
        BookingDTO booking = getBooking(
                payment.getBookingId());

        ZoneId zoneId = ZoneId.of(
                "Asia/Ho_Chi_Minh");

        LocalDateTime now = LocalDateTime.now(zoneId);

        LocalDateTime expire = now.plusMinutes(15);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(
                "yyyyMMddHHmmss");

        long vnpAmount = Math.round(
                payment.getAmount() * 100);

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
                String.valueOf(vnpAmount));

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
                now.format(formatter));

        vnpParams.put(
                "vnp_ExpireDate",
                expire.format(formatter));

        if (bankCode != null
                && !bankCode.isBlank()) {
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

        System.out.println(
                "===== VNPAY DEBUG =====");

        System.out.println(
                "TMN CODE: "
                        + vnpTmnCode.trim());

        System.out.println(
                "HASH SECRET LENGTH: "
                        + vnpHashSecret.trim().length());

        System.out.println(
                "HASH DATA: "
                        + hashData);

        System.out.println(
                "SECURE HASH: "
                        + secureHash);

        System.out.println(
                "=======================");

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

        if (vnpSecureHash == null
                || vnpSecureHash.isBlank()) {
            return false;
        }

        Map<String, String> verifyParams = new HashMap<>();

        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();

            if (key == null
                    || !key.startsWith("vnp_")) {
                continue;
            }

            if ("vnp_SecureHash".equals(key)
                    || "vnp_SecureHashType".equals(key)) {
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

        System.out.println(
                "===== VNPAY RETURN DEBUG =====");

        System.out.println(
                "RETURN HASH DATA: "
                        + hashData);

        System.out.println(
                "VNPAY HASH: "
                        + vnpSecureHash);

        System.out.println(
                "CALCULATED HASH: "
                        + calculatedHash);

        System.out.println(
                "==============================");

        return calculatedHash.equalsIgnoreCase(
                vnpSecureHash);
    }

    private BookingDTO getBooking(
            Long bookingId) {
        try {
            BookingDTO booking = bookingClient.getBookingById(
                    bookingId,
                    INTERNAL_ROLE);

            if (booking == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
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
                status == null ? "" : status).trim().toUpperCase();
    }
}