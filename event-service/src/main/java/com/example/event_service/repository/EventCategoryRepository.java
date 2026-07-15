package com.example.event_service.repository;

import com.example.event_service.entity.EventCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventCategoryRepository
        extends JpaRepository<EventCategory, Long>,
        JpaSpecificationExecutor<EventCategory> {

    boolean existsByNameIgnoreCase(
            String name);

    boolean existsBySlugIgnoreCase(
            String slug);

    boolean existsByNameIgnoreCaseAndIdNot(
            String name,
            Long id);

    boolean existsBySlugIgnoreCaseAndIdNot(
            String slug,
            Long id);
}