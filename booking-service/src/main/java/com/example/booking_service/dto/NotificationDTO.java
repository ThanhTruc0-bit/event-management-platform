package com.example.booking_service.dto;

import lombok.Data;

@Data
public class NotificationDTO {

    private Long id;

    private Long userId;

    private String title;

    private String message;
}