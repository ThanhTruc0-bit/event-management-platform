package com.example.event_service.service;

import com.example.event_service.dto.EventResponse;
import com.example.event_service.dto.SeatDTO;
import com.example.event_service.entity.Event;
import com.example.event_service.entity.EventCategory;
import com.example.event_service.feign.SeatClient;
import com.example.event_service.repository.EventCategoryRepository;
import com.example.event_service.repository.EventRepository;
import com.example.event_service.security.AdminGuard;
import com.example.event_service.specification.EventCategorySpecification;
import com.example.event_service.specification.EventSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

        private static final Set<String> ALLOWED_STATUSES = Set.of(
                        "DRAFT",
                        "UPCOMING",
                        "OPEN",
                        "SOLD_OUT",
                        "CLOSED",
                        "COMPLETED",
                        "CANCELLED");

        private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
                        "id",
                        "name",
                        "eventDate",
                        "saleStartAt",
                        "saleEndAt",
                        "featured",
                        "status",
                        "createdAt",
                        "updatedAt");

        private static final Set<String> ALLOWED_TICKET_STATUSES = Set.of(
                        "SELLING",
                        "LOW",
                        "SOLD_OUT",
                        "UPCOMING",
                        "ENDED",
                        "NO_TICKETS");

        private static final long MAX_BANNER_SIZE_BYTES = 5L * 1024L * 1024L;

        private final EventRepository eventRepository;

        private final EventCategoryRepository categoryRepository;

        private final SeatClient seatClient;

        private final AdminGuard adminGuard;

        @Value("${file.upload-dir:/app/uploads}")
        private String uploadRoot;

        public Page<EventResponse> searchEvents(
                        String keyword,
                        Long categoryId,
                        String status,
                        Boolean featured,
                        String location,
                        LocalDateTime fromDate,
                        LocalDateTime toDate,
                        String ticketStatus,
                        Double minPrice,
                        Double maxPrice,
                        boolean publicOnly,
                        int page,
                        int size,
                        String sortBy,
                        String sortDirection) {
                validatePage(page, size);

                validatePriceRange(
                                minPrice,
                                maxPrice);

                validateDateRange(
                                fromDate,
                                toDate);

                String normalizedStatus = normalizeOptionalStatus(status);

                String normalizedTicketStatus = normalizeOptionalTicketStatus(
                                ticketStatus);

                Set<Long> keywordCategoryIds = findCategoryIdsByKeyword(
                                keyword);

                Sort sort = createSort(
                                sortBy,
                                sortDirection);

                Specification<Event> specification = EventSpecification.filter(
                                keyword,
                                keywordCategoryIds,
                                categoryId,
                                normalizedStatus,
                                featured,
                                location,
                                fromDate,
                                toDate,
                                publicOnly);

                boolean requiresSeatFiltering = normalizedTicketStatus != null
                                || minPrice != null
                                || maxPrice != null;

                /*
                 * Không lọc theo giá/trạng thái vé:
                 * phân trang ngay tại MySQL.
                 */
                if (!requiresSeatFiltering) {
                        Pageable pageable = PageRequest.of(
                                        page,
                                        size,
                                        sort);

                        Page<Event> eventPage = eventRepository.findAll(
                                        specification,
                                        pageable);

                        Map<Long, EventCategory> categories = loadCategories(
                                        eventPage.getContent());

                        List<EventResponse> content = eventPage
                                        .getContent()
                                        .stream()
                                        .map(event -> toResponse(
                                                        event,
                                                        categories.get(
                                                                        event.getCategoryId()),
                                                        getSeatsSafely(
                                                                        event.getId())))
                                        .toList();

                        return new PageImpl<>(
                                        content,
                                        pageable,
                                        eventPage.getTotalElements());
                }

                /*
                 * Giá và trạng thái vé nằm trong Seat Service.
                 * Phải tổng hợp ghế, lọc rồi mới phân trang.
                 */
                List<Event> events = eventRepository.findAll(
                                specification,
                                sort);

                Map<Long, EventCategory> categories = loadCategories(events);

                List<EventResponse> filtered = events.stream()
                                .map(event -> toResponse(
                                                event,
                                                categories.get(
                                                                event.getCategoryId()),
                                                getSeatsRequired(
                                                                event.getId())))
                                .filter(response -> matchesPriceFilter(
                                                response,
                                                minPrice,
                                                maxPrice))
                                .filter(response -> matchesTicketStatus(
                                                response,
                                                normalizedTicketStatus))
                                .toList();

                int totalElements = filtered.size();

                int fromIndex = Math.min(
                                page * size,
                                totalElements);

                int toIndex = Math.min(
                                fromIndex + size,
                                totalElements);

                Pageable pageable = PageRequest.of(
                                page,
                                size,
                                sort);

                return new PageImpl<>(
                                filtered.subList(
                                                fromIndex,
                                                toIndex),
                                pageable,
                                totalElements);
        }

        public EventResponse getEventById(
                        Long id,
                        String role) {
                Event event = findEventEntity(id);

                String displayStatus = resolveAutomaticStatus(
                                event);

                if ("DRAFT".equals(
                                displayStatus)
                                && !adminGuard.isAdmin(role)) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found: " + id);
                }

                EventCategory category = categoryRepository
                                .findById(
                                                event.getCategoryId())
                                .orElse(null);

                return toResponse(
                                event,
                                category,
                                getSeatsSafely(id));
        }

        @Transactional
        public EventResponse createEvent(
                        Event request) {
                validateEvent(request);

                Event event = new Event();

                applyEventData(
                                event,
                                request,
                                false);

                event.setStatus(
                                resolveAutomaticStatus(event));

                Event saved = eventRepository.save(event);

                EventCategory category = categoryRepository
                                .findById(
                                                saved.getCategoryId())
                                .orElse(null);

                return toResponse(
                                saved,
                                category,
                                getSeatsSafely(
                                                saved.getId()));
        }

        @Transactional
        public EventResponse updateEvent(
                        Long id,
                        Event request) {
                Event existing = findEventEntity(id);

                validateEvent(request);

                applyEventData(
                                existing,
                                request,
                                true);

                existing.setStatus(
                                resolveAutomaticStatus(
                                                existing));

                Event saved = eventRepository.save(
                                existing);

                EventCategory category = categoryRepository
                                .findById(
                                                saved.getCategoryId())
                                .orElse(null);

                return toResponse(
                                saved,
                                category,
                                getSeatsSafely(
                                                saved.getId()));
        }

        @Transactional
        public EventResponse uploadBanner(
                        Long id,
                        MultipartFile file) {
                Event event = findEventEntity(id);

                validateBannerFile(file);

                String originalName = StringUtils.cleanPath(
                                Objects.requireNonNull(
                                                file.getOriginalFilename()));

                if (originalName.contains("..")) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid file path");
                }

                String extension = resolveExtension(
                                originalName,
                                file.getContentType());

                Path uploadDirectory = Paths.get(
                                uploadRoot,
                                "events")
                                .toAbsolutePath()
                                .normalize();

                Path newFilePath = null;

                try {
                        Files.createDirectories(
                                        uploadDirectory);

                        String fileName = UUID.randomUUID()
                                        + extension;

                        newFilePath = uploadDirectory
                                        .resolve(fileName)
                                        .normalize();

                        if (!newFilePath.startsWith(
                                        uploadDirectory)) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Invalid upload path");
                        }

                        Files.copy(
                                        file.getInputStream(),
                                        newFilePath,
                                        StandardCopyOption.REPLACE_EXISTING);

                        String oldBanner = event.getBanner();

                        event.setBanner(
                                        "/uploads/events/"
                                                        + fileName);

                        Event saved = eventRepository.saveAndFlush(
                                        event);

                        deleteOldBannerFile(
                                        oldBanner);

                        EventCategory category = categoryRepository
                                        .findById(
                                                        saved.getCategoryId())
                                        .orElse(null);

                        return toResponse(
                                        saved,
                                        category,
                                        getSeatsSafely(
                                                        saved.getId()));
                } catch (ResponseStatusException exception) {
                        deleteFileQuietly(
                                        newFilePath);

                        throw exception;
                } catch (Exception exception) {
                        deleteFileQuietly(
                                        newFilePath);

                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Upload banner failed");
                }
        }

        @Transactional
        public void deleteEvent(
                        Long id) {
                Event event = findEventEntity(id);

                String status = normalizeRequiredStatus(
                                event.getStatus());

                if (!"DRAFT".equals(status)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Chỉ được xóa sự kiện DRAFT. "
                                                        + "Sự kiện đã công khai phải chuyển sang CANCELLED.");
                }

                /*
                 * Seat Service lỗi thì trả 503.
                 * Không được hiểu nhầm thành event không có ghế.
                 */
                List<SeatDTO> seats = getSeatsRequired(id);

                if (!seats.isEmpty()) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Không thể xóa sự kiện vì đã có ghế hoặc loại vé.");
                }

                String oldBanner = event.getBanner();

                eventRepository.delete(event);

                deleteOldBannerFile(
                                oldBanner);
        }

        @Transactional
        public int refreshAutomaticStatuses() {
                List<Event> events = eventRepository.findAll();

                List<Event> changedEvents = new ArrayList<>();

                for (Event event : events) {
                        String current = normalizeRequiredStatus(
                                        event.getStatus());

                        String resolved = resolveAutomaticStatus(
                                        event);

                        if (!current.equals(resolved)) {
                                event.setStatus(resolved);

                                changedEvents.add(event);
                        }
                }

                if (!changedEvents.isEmpty()) {
                        eventRepository.saveAll(
                                        changedEvents);
                }

                return changedEvents.size();
        }

        private void applyEventData(
                        Event target,
                        Event request,
                        boolean preserveBlankBanner) {
                target.setName(
                                request.getName().trim());

                target.setDescription(
                                normalizeNullableText(
                                                request.getDescription()));

                target.setLocation(
                                normalizeNullableText(
                                                request.getLocation()));

                target.setCategoryId(
                                request.getCategoryId());

                target.setEventDate(
                                request.getEventDate());

                target.setSaleStartAt(
                                request.getSaleStartAt());

                target.setSaleEndAt(
                                request.getSaleEndAt());

                target.setFeatured(
                                Boolean.TRUE.equals(
                                                request.getFeatured()));

                target.setStatus(
                                normalizeRequiredStatus(
                                                request.getStatus()));

                String banner = normalizeNullableText(
                                request.getBanner());

                if (!preserveBlankBanner
                                || banner != null) {
                        target.setBanner(banner);
                }
        }

        private EventResponse toResponse(
                        Event event,
                        EventCategory category,
                        List<SeatDTO> seats) {
                List<SeatDTO> safeSeats = seats == null
                                ? List.of()
                                : seats;

                List<Double> prices = safeSeats.stream()
                                .map(
                                                SeatDTO::getPrice)
                                .filter(
                                                Objects::nonNull)
                                .filter(
                                                price -> price >= 0)
                                .toList();

                int totalSeats = safeSeats.size();

                int availableSeats = (int) safeSeats
                                .stream()
                                .filter(seat -> "AVAILABLE"
                                                .equalsIgnoreCase(
                                                                seat.getStatus()))
                                .count();

                Double minPrice = prices.stream()
                                .min(
                                                Double::compareTo)
                                .orElse(null);

                Double maxPrice = prices.stream()
                                .max(
                                                Double::compareTo)
                                .orElse(null);

                String status = resolveAutomaticStatus(
                                event);

                String saleStatus = resolveSaleStatus(
                                event);

                String ticketStatus = resolveTicketStatus(
                                status,
                                saleStatus,
                                totalSeats,
                                availableSeats);

                return EventResponse.builder()
                                .id(event.getId())
                                .name(event.getName())
                                .description(
                                                event.getDescription())
                                .location(
                                                event.getLocation())
                                .categoryId(
                                                event.getCategoryId())
                                .categoryName(
                                                category == null
                                                                ? null
                                                                : category.getName())
                                .categorySlug(
                                                category == null
                                                                ? null
                                                                : category.getSlug())
                                .eventDate(
                                                event.getEventDate())
                                .saleStartAt(
                                                event.getSaleStartAt())
                                .saleEndAt(
                                                event.getSaleEndAt())
                                .banner(
                                                event.getBanner())
                                .featured(
                                                event.getFeatured())
                                .status(status)
                                .createdAt(
                                                event.getCreatedAt())
                                .updatedAt(
                                                event.getUpdatedAt())
                                .minPrice(minPrice)
                                .maxPrice(maxPrice)
                                .totalSeats(totalSeats)
                                .availableSeats(
                                                availableSeats)
                                .ticketStatus(
                                                ticketStatus)
                                .saleStatus(
                                                saleStatus)
                                .build();
        }

        private Map<Long, EventCategory> loadCategories(
                        List<Event> events) {
                Set<Long> categoryIds = events.stream()
                                .map(
                                                Event::getCategoryId)
                                .filter(
                                                Objects::nonNull)
                                .collect(
                                                Collectors.toSet());

                return categoryRepository
                                .findAllById(categoryIds)
                                .stream()
                                .collect(
                                                Collectors.toMap(
                                                                EventCategory::getId,
                                                                category -> category));
        }

        private Set<Long> findCategoryIdsByKeyword(
                        String keyword) {
                if (keyword == null
                                || keyword.isBlank()) {
                        return Set.of();
                }

                return categoryRepository
                                .findAll(
                                                EventCategorySpecification
                                                                .filter(
                                                                                keyword,
                                                                                null))
                                .stream()
                                .map(
                                                EventCategory::getId)
                                .collect(
                                                Collectors.toSet());
        }

        private List<SeatDTO> getSeatsSafely(
                        Long eventId) {
                try {
                        List<SeatDTO> seats = seatClient.getSeatsByEvent(
                                        eventId);

                        return seats == null
                                        ? List.of()
                                        : seats;
                } catch (Exception exception) {
                        return List.of();
                }
        }

        private List<SeatDTO> getSeatsRequired(
                        Long eventId) {
                try {
                        List<SeatDTO> seats = seatClient.getSeatsByEvent(
                                        eventId);

                        return seats == null
                                        ? List.of()
                                        : seats;
                } catch (Exception exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Seat Service is unavailable");
                }
        }

        private boolean matchesPriceFilter(
                        EventResponse response,
                        Double minPrice,
                        Double maxPrice) {
                if (minPrice == null
                                && maxPrice == null) {
                        return true;
                }

                Double eventMinPrice = response.getMinPrice();

                Double eventMaxPrice = response.getMaxPrice();

                if (eventMinPrice == null
                                || eventMaxPrice == null) {
                        return false;
                }

                /*
                 * Hai khoảng giá phải giao nhau.
                 */
                if (minPrice != null
                                && eventMaxPrice < minPrice) {
                        return false;
                }

                return maxPrice == null
                                || eventMinPrice <= maxPrice;
        }

        private boolean matchesTicketStatus(
                        EventResponse response,
                        String ticketStatus) {
                return ticketStatus == null
                                || ticketStatus.equals(
                                                response.getTicketStatus());
        }

        private void validateEvent(
                        Event event) {
                if (event == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event data is required");
                }

                if (event.getName() == null
                                || event.getName().isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event name is required");
                }

                if (event.getName()
                                .trim()
                                .length() > 255) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event name is too long");
                }

                if (event.getDescription() != null
                                && event.getDescription()
                                                .trim()
                                                .length() > 5000) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event description is too long");
                }

                if (event.getLocation() == null
                                || event.getLocation().isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event location is required");
                }

                if (event.getLocation()
                                .trim()
                                .length() > 500) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event location is too long");
                }

                if (event.getBanner() != null
                                && event.getBanner()
                                                .trim()
                                                .length() > 1000) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event banner path is too long");
                }

                if (event.getCategoryId() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Category is required");
                }

                if (!categoryRepository.existsById(
                                event.getCategoryId())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Category does not exist");
                }

                if (event.getEventDate() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Event date is required");
                }

                if (event.getSaleStartAt() != null
                                && event.getSaleStartAt()
                                                .isAfter(
                                                                event.getEventDate())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Sale start time must be before event time");
                }

                if (event.getSaleStartAt() != null
                                && event.getSaleEndAt() != null
                                && event.getSaleStartAt()
                                                .isAfter(
                                                                event.getSaleEndAt())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Sale start time must be before sale end time");
                }

                if (event.getSaleEndAt() != null
                                && event.getSaleEndAt()
                                                .isAfter(
                                                                event.getEventDate())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Sale end time must be before event time");
                }

                normalizeRequiredStatus(
                                event.getStatus());
        }

        private String normalizeOptionalStatus(
                        String status) {
                if (status == null
                                || status.isBlank()
                                || "ALL".equalsIgnoreCase(
                                                status)) {
                        return null;
                }

                return normalizeRequiredStatus(
                                status);
        }

        private String normalizeRequiredStatus(
                        String status) {
                String value = status == null
                                || status.isBlank()
                                                ? "DRAFT"
                                                : status
                                                                .trim()
                                                                .toUpperCase(
                                                                                Locale.ROOT);

                if ("ACTIVE".equals(value)) {
                        value = "OPEN";
                }

                if ("ENDED".equals(value)) {
                        value = "COMPLETED";
                }

                if (!ALLOWED_STATUSES.contains(
                                value)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid event status: "
                                                        + status);
                }

                return value;
        }

        private String normalizeOptionalTicketStatus(
                        String ticketStatus) {
                if (ticketStatus == null
                                || ticketStatus.isBlank()
                                || "ALL".equalsIgnoreCase(
                                                ticketStatus)) {
                        return null;
                }

                String value = ticketStatus
                                .trim()
                                .toUpperCase(
                                                Locale.ROOT);

                if (!ALLOWED_TICKET_STATUSES
                                .contains(value)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid ticket status: "
                                                        + ticketStatus);
                }

                return value;
        }

        private String resolveAutomaticStatus(
                        Event event) {
                String current = normalizeRequiredStatus(
                                event.getStatus());

                if ("DRAFT".equals(current)
                                || "CANCELLED".equals(current)
                                || "COMPLETED".equals(current)) {
                        return current;
                }

                LocalDateTime now = LocalDateTime.now();

                /*
                 * SOLD_OUT vẫn thành COMPLETED
                 * sau khi sự kiện bắt đầu.
                 */
                if (event.getEventDate() != null
                                && !now.isBefore(
                                                event.getEventDate())) {
                        return "COMPLETED";
                }

                if ("SOLD_OUT".equals(current)) {
                        return "SOLD_OUT";
                }

                if ("CLOSED".equals(current)) {
                        return "CLOSED";
                }

                if (event.getSaleEndAt() != null
                                && !now.isBefore(
                                                event.getSaleEndAt())) {
                        return "CLOSED";
                }

                if (event.getSaleStartAt() != null
                                && now.isBefore(
                                                event.getSaleStartAt())) {
                        return "UPCOMING";
                }

                return "OPEN";
        }

        private String resolveSaleStatus(
                        Event event) {
                LocalDateTime now = LocalDateTime.now();

                if (event.getEventDate() != null
                                && !now.isBefore(
                                                event.getEventDate())) {
                        return "EVENT_STARTED";
                }

                if (event.getSaleStartAt() != null
                                && now.isBefore(
                                                event.getSaleStartAt())) {
                        return "NOT_STARTED";
                }

                if (event.getSaleEndAt() != null
                                && !now.isBefore(
                                                event.getSaleEndAt())) {
                        return "ENDED";
                }

                return "SELLING";
        }

        private String resolveTicketStatus(
                        String eventStatus,
                        String saleStatus,
                        int totalSeats,
                        int availableSeats) {
                if ("UPCOMING".equals(eventStatus)
                                || "NOT_STARTED".equals(
                                                saleStatus)) {
                        return "UPCOMING";
                }

                if ("CLOSED".equals(eventStatus)
                                || "COMPLETED".equals(
                                                eventStatus)
                                || "CANCELLED".equals(
                                                eventStatus)
                                || "ENDED".equals(
                                                saleStatus)
                                || "EVENT_STARTED".equals(
                                                saleStatus)) {
                        return "ENDED";
                }

                if ("SOLD_OUT".equals(
                                eventStatus)
                                || totalSeats > 0
                                                && availableSeats == 0) {
                        return "SOLD_OUT";
                }

                if (totalSeats == 0) {
                        return "NO_TICKETS";
                }

                if (availableSeats <= 5) {
                        return "LOW";
                }

                return "SELLING";
        }

        private Event findEventEntity(
                        Long id) {
                return eventRepository
                                .findById(id)
                                .orElseThrow(
                                                () -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Event not found: "
                                                                                + id));
        }

        private String normalizeNullableText(
                        String value) {
                if (value == null) {
                        return null;
                }

                String normalized = value.trim();

                return normalized.isBlank()
                                ? null
                                : normalized;
        }

        private void validatePage(
                        int page,
                        int size) {
                if (page < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "page must be greater than or equal to 0");
                }

                if (size < 1
                                || size > 100) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "size must be between 1 and 100");
                }
        }

        private void validatePriceRange(
                        Double minPrice,
                        Double maxPrice) {
                if (minPrice != null
                                && minPrice < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "minPrice cannot be negative");
                }

                if (maxPrice != null
                                && maxPrice < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "maxPrice cannot be negative");
                }

                if (minPrice != null
                                && maxPrice != null
                                && minPrice > maxPrice) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "minPrice must be less than or equal to maxPrice");
                }
        }

        private void validateDateRange(
                        LocalDateTime fromDate,
                        LocalDateTime toDate) {
                if (fromDate != null
                                && toDate != null
                                && fromDate.isAfter(toDate)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "fromDate must be before or equal to toDate");
                }
        }

        private Sort createSort(
                        String sortBy,
                        String sortDirection) {
                String field = ALLOWED_SORT_FIELDS
                                .contains(sortBy)
                                                ? sortBy
                                                : "eventDate";

                Sort.Direction direction = "desc".equalsIgnoreCase(
                                sortDirection)
                                                ? Sort.Direction.DESC
                                                : Sort.Direction.ASC;

                return Sort.by(
                                direction,
                                field);
        }

        private void validateBannerFile(
                        MultipartFile file) {
                if (file == null
                                || file.isEmpty()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Banner file is empty");
                }

                if (file.getOriginalFilename() == null
                                || file.getOriginalFilename()
                                                .isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Banner file name is empty");
                }

                if (file.getSize() > MAX_BANNER_SIZE_BYTES) {
                        throw new ResponseStatusException(
                                        HttpStatus.PAYLOAD_TOO_LARGE,
                                        "Banner file must not exceed 5 MB");
                }

                String contentType = file.getContentType();

                if (!Set.of(
                                "image/jpeg",
                                "image/png",
                                "image/webp")
                                .contains(contentType)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Only JPEG, PNG and WEBP images are allowed");
                }
        }

        private String resolveExtension(
                        String fileName,
                        String contentType) {
                String extension = getExtension(fileName);

                Set<String> allowed = Set.of(
                                ".jpg",
                                ".jpeg",
                                ".png",
                                ".webp");

                if (!allowed.contains(extension)) {
                        extension = switch (String.valueOf(
                                        contentType)) {
                                case "image/jpeg" ->
                                        ".jpg";

                                case "image/png" ->
                                        ".png";

                                case "image/webp" ->
                                        ".webp";

                                default ->
                                        "";
                        };
                }

                if (extension.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Invalid image extension");
                }

                return extension;
        }

        private String getExtension(
                        String fileName) {
                int dotIndex = fileName.lastIndexOf(".");

                if (dotIndex < 0) {
                        return "";
                }

                return fileName
                                .substring(dotIndex)
                                .toLowerCase(
                                                Locale.ROOT);
        }

        private void deleteOldBannerFile(
                        String oldBanner) {
                if (oldBanner == null
                                || !oldBanner.startsWith(
                                                "/uploads/events/")) {
                        return;
                }

                try {
                        String fileName = oldBanner.substring(
                                        "/uploads/events/"
                                                        .length());

                        Path uploadDirectory = Paths.get(
                                        uploadRoot,
                                        "events")
                                        .toAbsolutePath()
                                        .normalize();

                        Path filePath = uploadDirectory
                                        .resolve(fileName)
                                        .normalize();

                        if (!filePath.startsWith(
                                        uploadDirectory)) {
                                return;
                        }

                        Files.deleteIfExists(
                                        filePath);
                } catch (Exception ignored) {
                }
        }

        private void deleteFileQuietly(
                        Path filePath) {
                if (filePath == null) {
                        return;
                }

                try {
                        Files.deleteIfExists(
                                        filePath);
                } catch (Exception ignored) {
                }
        }
}