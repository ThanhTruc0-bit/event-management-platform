package com.example.event_service.controller;

import com.example.event_service.dto.EventResponse;
import com.example.event_service.entity.Event;
import com.example.event_service.security.AdminGuard;
import com.example.event_service.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    private final AdminGuard adminGuard;

    @GetMapping
    public Page<EventResponse> searchEvents(
            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long categoryId,

            @RequestParam(required = false) String status,

            @RequestParam(required = false) Boolean featured,

            @RequestParam(required = false) String location,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,

            @RequestParam(required = false) String ticketStatus,

            @RequestParam(required = false) Double minPrice,

            @RequestParam(required = false) Double maxPrice,

            @RequestParam(defaultValue = "false") boolean publicOnly,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "12") int size,

            @RequestParam(defaultValue = "eventDate") String sortBy,

            @RequestParam(defaultValue = "asc") String sortDirection) {
        return eventService.searchEvents(
                keyword,
                categoryId,
                status,
                featured,
                location,
                fromDate,
                toDate,
                ticketStatus,
                minPrice,
                maxPrice,
                publicOnly,
                page,
                size,
                sortBy,
                sortDirection);
    }

    @GetMapping("/{id}")
    public EventResponse getEventById(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        return eventService.getEventById(
                id,
                role);
    }

    @PostMapping
    public EventResponse createEvent(
            @RequestBody Event event,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        adminGuard.requireAdmin(
                role);

        return eventService.createEvent(
                event);
    }

    @PutMapping("/{id}")
    public EventResponse updateEvent(
            @PathVariable Long id,

            @RequestBody Event event,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        adminGuard.requireAdmin(
                role);

        return eventService.updateEvent(
                id,
                event);
    }

    @PostMapping("/{id}/upload-banner")
    public EventResponse uploadBanner(
            @PathVariable Long id,

            @RequestParam("file") MultipartFile file,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        adminGuard.requireAdmin(
                role);

        return eventService.uploadBanner(
                id,
                file);
    }

    @DeleteMapping("/{id}")
    public void deleteEvent(
            @PathVariable Long id,

            @RequestHeader(value = "X-User-Role", required = false) String role) {
        adminGuard.requireAdmin(
                role);

        eventService.deleteEvent(
                id);
    }
}