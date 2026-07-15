package com.example.event_service.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminGuard {

        public void requireAdmin(
                        String role) {
                if (!isAdmin(role)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "ADMIN role is required");
                }
        }

        public boolean isAdmin(
                        String role) {
                if (role == null
                                || role.isBlank()) {
                        return false;
                }

                String normalizedRole = role
                                .trim()
                                .toUpperCase();

                return "ADMIN".equals(
                                normalizedRole)
                                || "ROLE_ADMIN".equals(
                                                normalizedRole);
        }
}