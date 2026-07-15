package com.example.notification_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException exception,
            HttpServletRequest request) {
        int status = exception
                .getStatusCode()
                .value();

        String error;

        try {
            error = HttpStatus
                    .valueOf(status)
                    .getReasonPhrase();
        } catch (Exception ignored) {
            error = "Error";
        }

        return ResponseEntity
                .status(status)
                .body(
                        createBody(
                                status,
                                error,
                                exception.getReason(),
                                request.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(
                        createBody(
                                409,
                                "Conflict",
                                "Thông báo bị trùng hoặc vi phạm ràng buộc database.",
                                request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request) {
        exception.printStackTrace();

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        createBody(
                                500,
                                "Internal Server Error",
                                "Notification Service gặp lỗi ngoài dự kiến.",
                                request.getRequestURI()));
    }

    private Map<String, Object> createBody(
            int status,
            String error,
            String message,
            String path) {
        Map<String, Object> body = new LinkedHashMap<>();

        body.put(
                "timestamp",
                LocalDateTime.now());

        body.put(
                "status",
                status);

        body.put(
                "error",
                error);

        body.put(
                "message",
                message == null
                        ? error
                        : message);

        body.put(
                "path",
                path);

        return body;
    }
}