package com.example.event_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse
        implements Serializable {

    private Long id;

    private String name;

    private String description;

    private String location;

    private Long categoryId;

    private String categoryName;

    private String categorySlug;

    private LocalDateTime eventDate;

    private LocalDateTime saleStartAt;

    private LocalDateTime saleEndAt;

    private String banner;

    private Boolean featured;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Double minPrice;

    private Double maxPrice;

    private Integer totalSeats;

    private Integer availableSeats;

    private String ticketStatus;

    private String saleStatus;
}