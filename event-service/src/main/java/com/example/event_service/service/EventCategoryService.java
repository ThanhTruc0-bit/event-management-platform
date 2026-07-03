package com.example.event_service.service;

import com.example.event_service.entity.EventCategory;
import com.example.event_service.repository.EventCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class EventCategoryService {

    private final EventCategoryRepository categoryRepository;

    @Cacheable(value = "eventCategories")
    public List<EventCategory> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Cacheable(value = "eventCategory", key = "#id")
    public EventCategory getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Category not found: " + id
                ));
    }

    @CacheEvict(value = {"eventCategories", "eventCategory"}, allEntries = true)
    public EventCategory createCategory(EventCategory category) {
        if (category.getName() == null || category.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category name is required"
            );
        }

        if (category.getSlug() == null || category.getSlug().isBlank()) {
            category.setSlug(toSlug(category.getName()));
        }

        if (category.getStatus() == null || category.getStatus().isBlank()) {
            category.setStatus("ACTIVE");
        }

        return categoryRepository.save(category);
    }

    @CacheEvict(value = {"eventCategories", "eventCategory"}, allEntries = true)
    public EventCategory updateCategory(Long id, EventCategory category) {
        EventCategory existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Category not found: " + id
                ));

        if (category.getName() == null || category.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category name is required"
            );
        }

        existingCategory.setName(category.getName());
        existingCategory.setDescription(category.getDescription());
        existingCategory.setStatus(category.getStatus());

        if (category.getSlug() != null && !category.getSlug().isBlank()) {
            existingCategory.setSlug(category.getSlug());
        } else {
            existingCategory.setSlug(toSlug(category.getName()));
        }

        return categoryRepository.save(existingCategory);
    }

    @CacheEvict(value = {"eventCategories", "eventCategory"}, allEntries = true)
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Category not found: " + id
            );
        }

        categoryRepository.deleteById(id);
    }

    private String toSlug(String input) {
        if (input == null) {
            return "";
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);

        String withoutAccent = Pattern.compile("\\p{InCombiningDiacriticalMarks}+")
                .matcher(normalized)
                .replaceAll("");

        return withoutAccent
                .toLowerCase(Locale.ROOT)
                .replaceAll("đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}