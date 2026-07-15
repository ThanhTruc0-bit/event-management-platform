package com.example.event_service.scheduler;

import com.example.event_service.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventStatusScheduler {

    private final EventService eventService;

    /*
     * Mỗi phút tự cập nhật:
     * UPCOMING -> OPEN
     * OPEN -> CLOSED
     * CLOSED -> COMPLETED
     */
    @Scheduled(fixedDelay = 60000)
    public void refreshStatuses() {
        eventService
                .refreshAutomaticStatuses();
    }
}