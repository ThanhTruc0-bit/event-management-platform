package com.example.notification_service.dto;

import lombok.Data;

@Data
public class NotificationCreateRequest {

    private Long userId;

    private Long bookingId;

    private String title;

    private String message;

    private String type;

    private String actionUrl;
}