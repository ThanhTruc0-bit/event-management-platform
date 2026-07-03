package com.example.booking_service.feign;

import com.example.booking_service.dto.PaymentDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "PAYMENT-SERVICE")
public interface PaymentClient {

    @PostMapping("/payments")
    PaymentDTO createPayment(@RequestBody PaymentDTO paymentDTO);

}