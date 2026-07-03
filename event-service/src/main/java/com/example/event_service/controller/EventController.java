package com.example.event_service.controller;

import com.example.event_service.entity.Event;
import com.example.event_service.security.AdminGuard;
import com.example.event_service.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final AdminGuard adminGuard;

    @GetMapping
    public List<Event> getAllEvents() {
        return eventService.getAllEvents();
    }

    @GetMapping("/{id}")
    public Event getEventById(@PathVariable Long id) {
        return eventService.getEventById(id);
    }

    @PostMapping
    public Event createEvent(
            @RequestBody Event event,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        return eventService.createEvent(event);
    }

    @PutMapping("/{id}")
    public Event updateEvent(
            @PathVariable Long id,
            @RequestBody Event event,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        return eventService.updateEvent(id, event);
    }

    @PostMapping("/{id}/upload-banner")
    public Event uploadBanner(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        return eventService.uploadBanner(id, file);
    }

    @DeleteMapping("/{id}")
    public void deleteEvent(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        eventService.deleteEvent(id);
    }
}