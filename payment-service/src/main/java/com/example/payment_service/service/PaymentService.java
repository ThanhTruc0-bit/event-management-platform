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

    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;

    private static final String INTERNAL_ROLE = "ADMIN";

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
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment not found: " + id
                ));
    }

    public List<Payment> getPaymentsByBooking(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId);
    }

    public Payment createPayment(Payment payment) {
        if (payment.getBookingId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingId is required");
        }

        BookingDTO booking = getBooking(payment.getBookingId());

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PENDING booking can create payment. Current status: " + booking.getStatus()
            );
        }

        if (payment.getAmount() == null) {
            payment.setAmount(booking.getTotalAmount());
        }

        if (Double.compare(payment.getAmount(), booking.getTotalAmount()) != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment amount does not match booking total amount"
            );
        }

        if (payment.getPaymentMethod() == null || payment.getPaymentMethod().isBlank()) {
            payment.setPaymentMethod("VNPAY");
        }

        payment.setStatus("PENDING");
        payment.setPaymentDate(null);

        if (payment.getTransactionCode() == null || payment.getTransactionCode().isBlank()) {
            payment.setTransactionCode(generateTransactionCode(payment.getBookingId()));
        }

        return paymentRepository.save(payment);
    }

    public Payment createVnpayPaymentForBooking(
            Long bookingId,
            String bankCode,
            HttpServletRequest request
    ) {
        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setPaymentMethod("VNPAY");

        payment = createPayment(payment);

        String paymentUrl = buildVnpayPaymentUrl(payment, bankCode, request);

        payment.setPaymentUrl(paymentUrl);
        payment.setQrContent("VNPAY_PAYMENT_URL:" + paymentUrl);

        return paymentRepository.save(payment);
    }

    public Payment handleVnpayReturn(Map<String, String> params) {
        boolean validSignature = verifyVnpaySignature(params);

        if (!validSignature) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid VNPay signature"
            );
        }

        String transactionCode = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        String transactionNo = params.get("vnp_TransactionNo");
        String bankCode = params.get("vnp_BankCode");

        Payment payment = paymentRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment not found by transactionCode: " + transactionCode
                ));

        payment.setVnpResponseCode(responseCode);
        payment.setVnpTransactionNo(transactionNo);
        payment.setVnpBankCode(bankCode);
        payment.setPaymentDate(LocalDateTime.now());

        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            payment.setStatus("SUCCESS");

            Payment savedPayment = paymentRepository.save(payment);

            bookingClient.updateBookingStatus(
                    savedPayment.getBookingId(),
                    "PAID",
                    INTERNAL_ROLE
            );

            return savedPayment;
        }

        payment.setStatus("FAILED");

        return paymentRepository.save(payment);
    }

    public Payment confirmPaymentSuccess(Long id) {
        Payment payment = getPaymentById(id);

        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            return payment;
        }

        BookingDTO booking = getBooking(payment.getBookingId());

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())
                && !"PAID".equalsIgnoreCase(booking.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PENDING booking can be paid. Current status: " + booking.getStatus()
            );
        }

        payment.setStatus("SUCCESS");
        payment.setPaymentDate(LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        if (!"PAID".equalsIgnoreCase(booking.getStatus())) {
            bookingClient.updateBookingStatus(
                    savedPayment.getBookingId(),
                    "PAID",
                    INTERNAL_ROLE
            );
        }

        return savedPayment;
    }

    public Payment markPaymentFailed(Long id) {
        Payment payment = getPaymentById(id);

        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "SUCCESS payment cannot be marked as FAILED"
            );
        }

        payment.setStatus("FAILED");
        payment.setPaymentDate(LocalDateTime.now());

        return paymentRepository.save(payment);
    }

    public Payment updatePayment(Long id, Payment payment) {
        Payment oldPayment = getPaymentById(id);

        if (payment.getPaymentMethod() != null && !payment.getPaymentMethod().isBlank()) {
            oldPayment.setPaymentMethod(payment.getPaymentMethod());
        }

        if (payment.getStatus() != null && !payment.getStatus().isBlank()) {
            String newStatus = payment.getStatus().trim().toUpperCase();

            if ("SUCCESS".equals(newStatus)) {
                paymentRepository.save(oldPayment);
                return confirmPaymentSuccess(id);
            }

            if ("FAILED".equals(newStatus)) {
                paymentRepository.save(oldPayment);
                return markPaymentFailed(id);
            }

            if ("PENDING".equals(newStatus)) {
                oldPayment.setStatus("PENDING");
                oldPayment.setPaymentDate(null);
            } else {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid payment status: " + payment.getStatus()
                );
            }
        }

        return paymentRepository.save(oldPayment);
    }

    public void deletePayment(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Payment not found: " + id
            );
        }

        paymentRepository.deleteById(id);
    }

    public String buildFrontendRedirectUrl(Payment payment) {
        return frontendReturnUrl.trim()
                + "?paymentId=" + payment.getId()
                + "&bookingId=" + payment.getBookingId()
                + "&status=" + payment.getStatus();
    }

    public String buildFrontendErrorUrl(String message) {
        return frontendReturnUrl.trim()
                + "?status=FAILED"
                + "&message=" + VnpayUtil.urlEncode(message);
    }

    private String buildVnpayPaymentUrl(
            Payment payment,
            String bankCode,
            HttpServletRequest request
    ) {
        BookingDTO booking = getBooking(payment.getBookingId());

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDateTime now = LocalDateTime.now(zoneId);
        LocalDateTime expire = now.plusMinutes(15);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

        long vnpAmount = Math.round(payment.getAmount() * 100);

        Map<String, String> vnpParams = new TreeMap<>();

        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpTmnCode.trim());
        vnpParams.put("vnp_Amount", String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", payment.getTransactionCode());
        vnpParams.put("vnp_OrderInfo", "Thanh toan booking " + booking.getBookingCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpReturnUrl.trim());
        vnpParams.put("vnp_IpAddr", VnpayUtil.getIpAddress(request));
        vnpParams.put("vnp_CreateDate", now.format(formatter));
        vnpParams.put("vnp_ExpireDate", expire.format(formatter));

        if (bankCode != null && !bankCode.isBlank()) {
            vnpParams.put("vnp_BankCode", bankCode.trim());
        }

        String hashData = VnpayUtil.buildHashData(vnpParams);
        String queryString = VnpayUtil.buildQueryString(vnpParams);

        String secureHash = VnpayUtil.hmacSHA512(
                vnpHashSecret.trim(),
                hashData
        );

        System.out.println("===== VNPAY DEBUG =====");
        System.out.println("TMN CODE: " + vnpTmnCode.trim());
        System.out.println("HASH SECRET LENGTH: " + vnpHashSecret.trim().length());
        System.out.println("HASH DATA: " + hashData);
        System.out.println("SECURE HASH: " + secureHash);
        System.out.println("=======================");

        return vnpPayUrl.trim() + "?" + queryString + "&vnp_SecureHash=" + secureHash;
    }

    private boolean verifyVnpaySignature(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");

        if (vnpSecureHash == null || vnpSecureHash.isBlank()) {
            return false;
        }

        Map<String, String> verifyParams = new HashMap<>(params);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");

        String hashData = VnpayUtil.buildHashData(verifyParams);

        String calculatedHash = VnpayUtil.hmacSHA512(
                vnpHashSecret.trim(),
                hashData
        );

        System.out.println("===== VNPAY RETURN DEBUG =====");
        System.out.println("RETURN HASH DATA: " + hashData);
        System.out.println("VNPAY HASH: " + vnpSecureHash);
        System.out.println("CALCULATED HASH: " + calculatedHash);
        System.out.println("==============================");

        return calculatedHash.equalsIgnoreCase(vnpSecureHash);
    }

    private BookingDTO getBooking(Long bookingId) {
        try {
            BookingDTO booking = bookingClient.getBookingById(bookingId, INTERNAL_ROLE);

            if (booking == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Booking not found: " + bookingId
                );
            }

            return booking;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot get booking: " + bookingId
            );
        }
    }

    private String generateTransactionCode(Long bookingId) {
        return "PAY" + bookingId + System.currentTimeMillis();
    }
}