package com.example.event_service.controller;

import com.example.event_service.entity.EventCategory;
import com.example.event_service.security.AdminGuard;
import com.example.event_service.service.EventCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/event-categories")
@RequiredArgsConstructor
public class EventCategoryController {

    private final EventCategoryService categoryService;
    private final AdminGuard adminGuard;

    @GetMapping
    public List<EventCategory> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/{id}")
    public EventCategory getCategoryById(@PathVariable Long id) {
        return categoryService.getCategoryById(id);
    }

    @PostMapping
    public EventCategory createCategory(
            @RequestBody EventCategory category,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        return categoryService.createCategory(category);
    }

    @PutMapping("/{id}")
    public EventCategory updateCategory(
            @PathVariable Long id,
            @RequestBody EventCategory category,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        return categoryService.updateCategory(id, category);
    }

    @DeleteMapping("/{id}")
    public void deleteCategory(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        adminGuard.requireAdmin(role);
        categoryService.deleteCategory(id);
    }
}