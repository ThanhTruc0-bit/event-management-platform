package com.example.payment_service.feign;

import com.example.payment_service.dto.BookingDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "booking-service")
public interface BookingClient {

        @GetMapping("/bookings/{id}")
        BookingDTO getBookingById(
                        @PathVariable("id") Long id,

                        @RequestHeader("X-User-Role") String role);

        @PutMapping("/bookings/{id}/status")
        BookingDTO updateBookingStatus(
                        @PathVariable("id") Long id,

                        @RequestParam("status") String status,

                        @RequestHeader("X-User-Role") String role);
}