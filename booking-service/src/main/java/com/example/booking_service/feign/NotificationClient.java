package com.example.booking_service.feign;

import com.example.booking_service.dto.NotificationDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "NOTIFICATION-SERVICE")
public interface NotificationClient {

    @PostMapping("/notifications")
    NotificationDTO createNotification(
            @RequestBody NotificationDTO notificationDTO);

}