package com.example.booking_service.scheduler;

import com.example.booking_service.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingExpirationScheduler {

    private final BookingService bookingService;

    /*
     * Mỗi 60 giây:
     * - tìm booking PENDING quá hạn;
     * - chuyển EXPIRED;
     * - trả ghế AVAILABLE.
     */
    @Scheduled(fixedDelay = 60000)
    public void expirePendingBookings() {
        bookingService
                .expirePendingBookings();
    }
}