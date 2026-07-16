package com.example.event_service.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
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
                String message = "Giá trị không hợp lệ cho tham số: "
                                + exception.getName();

                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                message,
                                                                request.getRequestURI()));
        }

        @ExceptionHandler(MissingServletRequestParameterException.class)
        public ResponseEntity<Map<String, Object>> handleMissingParameter(
                        MissingServletRequestParameterException exception,
                        HttpServletRequest request) {
                String message = "Thiếu tham số bắt buộc: "
                                + exception.getParameterName();

                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                message,
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

        @ExceptionHandler(MaxUploadSizeExceededException.class)
        public ResponseEntity<Map<String, Object>> handleMaxUploadSize(
                        MaxUploadSizeExceededException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(
                                                HttpStatus.PAYLOAD_TOO_LARGE)
                                .body(
                                                createBody(
                                                                HttpStatus.PAYLOAD_TOO_LARGE
                                                                                .value(),
                                                                "Payload Too Large",
                                                                "Ảnh tải lên vượt quá dung lượng cho phép.",
                                                                request.getRequestURI()));
        }

        @ExceptionHandler(MultipartException.class)
        public ResponseEntity<Map<String, Object>> handleMultipartException(
                        MultipartException exception,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(
                                                createBody(
                                                                HttpStatus.BAD_REQUEST.value(),
                                                                "Bad Request",
                                                                "Dữ liệu upload không hợp lệ.",
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
                                                                "Dữ liệu bị trùng hoặc đang được sử dụng.",
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
                                                                HttpStatus.INTERNAL_SERVER_ERROR
                                                                                .value(),
                                                                "Internal Server Error",
                                                                "Event Service gặp lỗi ngoài dự kiến.",
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