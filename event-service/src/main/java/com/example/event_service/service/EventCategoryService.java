package com.example.event_service.service;

import com.example.event_service.entity.EventCategory;
import com.example.event_service.repository.EventCategoryRepository;
import com.example.event_service.repository.EventRepository;
import com.example.event_service.specification.EventCategorySpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class EventCategoryService {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "ACTIVE",
            "INACTIVE");

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "name",
            "slug",
            "status",
            "createdAt",
            "updatedAt");

    private final EventCategoryRepository categoryRepository;

    private final EventRepository eventRepository;

    public Page<EventCategory> searchCategories(
            String keyword,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDirection) {
        validatePage(
                page,
                size);

        String normalizedStatus = normalizeOptionalStatus(
                status);

        Pageable pageable = PageRequest.of(
                page,
                size,
                createSort(
                        sortBy,
                        sortDirection));

        return categoryRepository.findAll(
                EventCategorySpecification.filter(
                        keyword,
                        normalizedStatus),
                pageable);
    }

    @Cacheable(value = "eventCategory", key = "#id", sync = true)
    public EventCategory getCategoryById(
            Long id) {
        return categoryRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Category not found: "
                                        + id));
    }

    @CacheEvict(value = {
            "eventCategory"
    }, allEntries = true)
    public EventCategory createCategory(
            EventCategory category) {
        validateCategory(category);

        String name = category
                .getName()
                .trim();

        String slug = category.getSlug();

        if (slug == null
                || slug.isBlank()) {
            slug = toSlug(name);
        } else {
            slug = toSlug(slug);
        }

        if (slug.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category slug is invalid");
        }

        if (categoryRepository
                .existsByNameIgnoreCase(
                        name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category name already exists");
        }

        if (categoryRepository
                .existsBySlugIgnoreCase(
                        slug)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category slug already exists");
        }

        category.setId(null);
        category.setName(name);
        category.setSlug(slug);
        category.setDescription(
                normalizeNullableText(
                        category.getDescription()));

        category.setStatus(
                normalizeRequiredStatus(
                        category.getStatus()));

        return categoryRepository.save(
                category);
    }

    @CacheEvict(value = {
            "eventCategory"
    }, allEntries = true)
    public EventCategory updateCategory(
            Long id,
            EventCategory request) {
        EventCategory existing = categoryRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Category not found: "
                                        + id));

        validateCategory(request);

        String name = request
                .getName()
                .trim();

        String slug = request.getSlug();

        if (slug == null
                || slug.isBlank()) {
            slug = toSlug(name);
        } else {
            slug = toSlug(slug);
        }

        if (categoryRepository
                .existsByNameIgnoreCaseAndIdNot(
                        name,
                        id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category name already exists");
        }

        if (categoryRepository
                .existsBySlugIgnoreCaseAndIdNot(
                        slug,
                        id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category slug already exists");
        }

        existing.setName(name);
        existing.setSlug(slug);

        existing.setDescription(
                normalizeNullableText(
                        request.getDescription()));

        existing.setStatus(
                normalizeRequiredStatus(
                        request.getStatus()));

        return categoryRepository.save(
                existing);
    }

    @CacheEvict(value = {
            "eventCategory"
    }, allEntries = true)
    public void deleteCategory(
            Long id) {
        EventCategory category = categoryRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Category not found: "
                                        + id));

        if (eventRepository
                .existsByCategoryId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể xóa danh mục vì đang có sự kiện sử dụng danh mục này.");
        }

        categoryRepository.delete(
                category);
    }

    private void validateCategory(
            EventCategory category) {
        if (category == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category data is required");
        }

        if (category.getName() == null
                || category
                        .getName()
                        .isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category name is required");
        }

        if (category
                .getName()
                .trim()
                .length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category name is too long");
        }
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
        String normalized = status == null
                || status.isBlank()
                        ? "ACTIVE"
                        : status
                                .trim()
                                .toUpperCase();

        if (!ALLOWED_STATUSES.contains(
                normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid category status: "
                            + status);
        }

        return normalized;
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

    private Sort createSort(
            String sortBy,
            String sortDirection) {
        String field = ALLOWED_SORT_FIELDS.contains(
                sortBy)
                        ? sortBy
                        : "name";

        Sort.Direction direction = "desc".equalsIgnoreCase(
                sortDirection)
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;

        return Sort.by(
                direction,
                field);
    }

    private String toSlug(
            String input) {
        if (input == null) {
            return "";
        }

        String normalized = Normalizer.normalize(
                input,
                Normalizer.Form.NFD);

        String withoutAccent = Pattern
                .compile(
                        "\\p{InCombiningDiacriticalMarks}+")
                .matcher(normalized)
                .replaceAll("");

        return withoutAccent
                .toLowerCase(
                        Locale.ROOT)
                .replace("đ", "d")
                .replaceAll(
                        "[^a-z0-9\\s-]",
                        "")
                .replaceAll(
                        "\\s+",
                        "-")
                .replaceAll(
                        "-+",
                        "-")
                .replaceAll(
                        "^-|-$",
                        "");
    }
}