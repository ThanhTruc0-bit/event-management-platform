package com.example.notification_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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
                int status = exception.getStatusCode().value();

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

        @ExceptionHandler(MethodArgumentTypeMismatchException.class)
        public ResponseEntity<Map<String, Object>> handleTypeMismatch(
                        MethodArgumentTypeMismatchException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                "Giá trị không hợp lệ cho tham số: "
                                                                                + exception.getName(),
                                                                request.getRequestURI()));
        }

        @ExceptionHandler(MissingServletRequestParameterException.class)
        public ResponseEntity<Map<String, Object>> handleMissingParameter(
                        MissingServletRequestParameterException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                "Thiếu tham số bắt buộc: "
                                                                                + exception.getParameterName(),
                                                                request.getRequestURI()));
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<Map<String, Object>> handleUnreadableBody(
                        HttpMessageNotReadableException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                "Request body không hợp lệ hoặc sai định dạng.",
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
                                                                HttpStatus.CONFLICT.value(),
                                                                "Conflict",
                                                                "Thông báo bị trùng hoặc vi phạm ràng buộc database.",
                                                                request.getRequestURI()));
        }

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<Map<String, Object>> handleIllegalArgument(
                        IllegalArgumentException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
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
                                                createBody(
                                                                HttpStatus.INTERNAL_SERVER_ERROR.value(),
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