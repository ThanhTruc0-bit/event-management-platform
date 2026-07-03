package com.example.payment_service.controller;

import com.example.payment_service.entity.Payment;
import com.example.payment_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    @GetMapping("/{id}")
    public Payment getPaymentById(@PathVariable Long id) {
        return paymentService.getPaymentById(id);
    }

    @GetMapping("/booking/{bookingId}")
    public List<Payment> getPaymentsByBooking(@PathVariable Long bookingId) {
        return paymentService.getPaymentsByBooking(bookingId);
    }

    @PostMapping
    public Payment createPayment(@RequestBody Payment payment) {
        return paymentService.createPayment(payment);
    }

    @PostMapping("/booking/{bookingId}/vnpay")
    public Payment createVnpayPaymentForBooking(
            @PathVariable Long bookingId,
            @RequestParam(required = false) String bankCode,
            HttpServletRequest request
    ) {
        return paymentService.createVnpayPaymentForBooking(bookingId, bankCode, request);
    }

    @GetMapping("/vnpay-return")
    public void handleVnpayReturn(
            @RequestParam Map<String, String> params,
            HttpServletResponse response
    ) throws IOException {
        try {
            Payment payment = paymentService.handleVnpayReturn(params);
            response.sendRedirect(paymentService.buildFrontendRedirectUrl(payment));
        } catch (Exception e) {
            response.sendRedirect(paymentService.buildFrontendErrorUrl(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public Payment updatePayment(
            @PathVariable Long id,
            @RequestBody Payment payment
    ) {
        return paymentService.updatePayment(id, payment);
    }

    @PutMapping("/{id}/success")
    public Payment confirmPaymentSuccess(@PathVariable Long id) {
        return paymentService.confirmPaymentSuccess(id);
    }

    @PutMapping("/{id}/failed")
    public Payment markPaymentFailed(@PathVariable Long id) {
        return paymentService.markPaymentFailed(id);
    }

    @DeleteMapping("/{id}")
    public void deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
    }
}