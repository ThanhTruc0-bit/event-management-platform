package com.example.event_service.repository;

import com.example.event_service.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventRepository
                extends JpaRepository<Event, Long>,
                JpaSpecificationExecutor<Event> {

        boolean existsByCategoryId(
                        Long categoryId);
}