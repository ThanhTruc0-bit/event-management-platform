package com.example.booking_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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
                        createErrorBody(
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
                        createErrorBody(
                                HttpStatus.CONFLICT.value(),
                                "Conflict",
                                "Dữ liệu bị trùng hoặc vi phạm ràng buộc database.",
                                request.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(
                        createErrorBody(
                                HttpStatus.BAD_REQUEST.value(),
                                "Bad Request",
                                exception.getMessage(),
                                request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request) {
        exception.printStackTrace();

        return ResponseEntity
                .status(
                        HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        createErrorBody(
                                HttpStatus.INTERNAL_SERVER_ERROR
                                        .value(),
                                "Internal Server Error",
                                "Booking Service gặp lỗi ngoài dự kiến.",
                                request.getRequestURI()));
    }

    private Map<String, Object> createErrorBody(
            int status,
            String error,
            String message,
            String path) {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put(
                "timestamp",
                LocalDateTime.now());

        response.put(
                "status",
                status);

        response.put(
                "error",
                error);

        response.put(
                "message",
                message == null
                        ? error
                        : message);

        response.put(
                "path",
                path);

        return response;
    }
}