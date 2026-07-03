package com.example.event_service.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminGuard {

    public void requireAdmin(String role) {
        if (role == null || !role.equalsIgnoreCase("ADMIN")) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "ADMIN role required"
            );
        }
    }
}