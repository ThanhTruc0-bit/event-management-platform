package com.example.booking_service.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EventDTO {

    private Long id;
    private String name;
    private String location;
    private LocalDateTime eventDate;
    private Double price;

}