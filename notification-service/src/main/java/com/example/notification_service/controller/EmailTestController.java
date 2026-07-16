package com.example.notification_service.controller;

import com.example.notification_service.dto.EmailTestRequest;
import com.example.notification_service.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/notifications/email")
@RequiredArgsConstructor
public class EmailTestController {

    private final EmailService emailService;

    /*
     * Endpoint tạm thời chỉ để ADMIN kiểm tra SMTP.
     *
     * Sau khi hoàn thành phần email có thể xóa endpoint này.
     */
    @PostMapping("/test")
    public Map<String, String> sendTestEmail(
            @RequestBody EmailTestRequest request,

            @RequestHeader(value = "X-User-Role", required = false) String currentRole) {
        requireAdmin(
                currentRole);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required");
        }

        emailService.sendTestEmail(
                request.getTo());

        return Map.of(
                "message",
                "Test email was sent successfully",
                "to",
                request.getTo());
    }

    private void requireAdmin(
            String role) {
        if (role == null ||
                role.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "ADMIN role is required");
        }

        String normalizedRole = role.trim()
                .replaceFirst(
                        "(?i)^ROLE_",
                        "")
                .toUpperCase();

        if (!"ADMIN".equals(
                normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "ADMIN role is required");
        }
    }
}