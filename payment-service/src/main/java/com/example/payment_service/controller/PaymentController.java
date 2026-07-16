package com.example.payment_service.controller;

import com.example.payment_service.entity.Payment;
import com.example.payment_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public Page<Payment> getPayments(
            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long bookingId,

            @RequestParam(required = false) String status,

            @RequestParam(required = false) String paymentMethod,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,

            @RequestParam(defaultValue = "createdAt") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection) {
        return paymentService.getPayments(
                page,
                size,
                keyword,
                bookingId,
                status,
                paymentMethod,
                fromDate,
                toDate,
                sortBy,
                sortDirection);
    }

    @GetMapping("/{id}")
    public Payment getPaymentById(
            @PathVariable Long id) {
        return paymentService.getPaymentById(
                id);
    }

    @GetMapping("/booking/{bookingId}")
    public List<Payment> getPaymentsByBooking(
            @PathVariable Long bookingId) {
        return paymentService.getPaymentsByBooking(
                bookingId);
    }

    @PostMapping
    public Payment createPayment(
            @RequestBody Payment payment) {
        return paymentService.createPayment(
                payment);
    }

    @PostMapping("/booking/{bookingId}/vnpay")
    public Payment createVnpayPaymentForBooking(
            @PathVariable Long bookingId,

            @RequestParam(required = false) String bankCode,

            HttpServletRequest request) {
        return paymentService.createVnpayPaymentForBooking(
                bookingId,
                bankCode,
                request);
    }

    /*
     * Endpoint này phải public tại API Gateway vì
     * trình duyệt được VNPay chuyển hướng về đây.
     */
    @GetMapping("/vnpay-return")
    public void handleVnpayReturn(
            @RequestParam Map<String, String> params,

            HttpServletResponse response) throws IOException {
        try {
            Payment payment = paymentService.handleVnpayReturn(
                    params);

            response.sendRedirect(
                    paymentService.buildFrontendRedirectUrl(
                            payment));
        } catch (Exception exception) {
            response.sendRedirect(
                    paymentService.buildFrontendErrorUrl(
                            exception.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public Payment updatePayment(
            @PathVariable Long id,

            @RequestBody Payment payment) {
        return paymentService.updatePayment(
                id,
                payment);
    }

    @PutMapping("/{id}/success")
    public Payment confirmPaymentSuccess(
            @PathVariable Long id) {
        return paymentService.confirmPaymentSuccess(
                id);
    }

    @PutMapping("/{id}/failed")
    public Payment markPaymentFailed(
            @PathVariable Long id) {
        return paymentService.markPaymentFailed(
                id);
    }

    @PutMapping("/{id}/retry-booking-sync")
    public Payment retryBookingSynchronization(
            @PathVariable Long id) {
        return paymentService.retryBookingSynchronization(
                id);
    }

    @DeleteMapping("/{id}")
    public void deletePayment(
            @PathVariable Long id) {
        paymentService.deletePayment(
                id);
    }
}