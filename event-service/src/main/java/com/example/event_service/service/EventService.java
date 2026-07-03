package com.example.event_service.service;

import com.example.event_service.entity.Event;
import com.example.event_service.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;

    @Cacheable(value = "events")
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    @Cacheable(value = "event", key = "#id")
    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Event not found: " + id
                ));
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    public Event createEvent(Event event) {
        if (event.getStatus() == null || event.getStatus().isBlank()) {
            event.setStatus("DRAFT");
        }

        return eventRepository.save(event);
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    public Event updateEvent(Long id, Event event) {
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Event not found: " + id
                ));

        existingEvent.setName(event.getName());
        existingEvent.setDescription(event.getDescription());
        existingEvent.setLocation(event.getLocation());
        existingEvent.setCategory(event.getCategory());
        existingEvent.setEventDate(event.getEventDate());
        existingEvent.setStatus(event.getStatus());

        /*
         * Không tự set banner = null khi update event.
         * Vì banner sẽ được cập nhật riêng bằng API upload-banner.
         */
        if (event.getBanner() != null && !event.getBanner().isBlank()) {
            existingEvent.setBanner(event.getBanner());
        }

        return eventRepository.save(existingEvent);
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    public Event uploadBanner(Long id, MultipartFile file) {
        try {
            Event event = eventRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Event not found: " + id
                    ));

            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "File is empty"
                );
            }

            String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

            String extension = "";
            int dotIndex = originalFileName.lastIndexOf(".");
            if (dotIndex >= 0) {
                extension = originalFileName.substring(dotIndex);
            }

            String uploadDir = "uploads/events/";
            File dir = new File(uploadDir);

            if (!dir.exists()) {
                dir.mkdirs();
            }

            String fileName = UUID.randomUUID() + extension;
            Path filePath = Paths.get(uploadDir + fileName);

            Files.write(filePath, file.getBytes());

            String imageUrl = "http://localhost:8084/uploads/events/" + fileName;

            event.setBanner(imageUrl);

            return eventRepository.save(event);

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Upload banner failed: " + e.getMessage()
            );
        }
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Event not found: " + id
            );
        }

        eventRepository.deleteById(id);
    }
}