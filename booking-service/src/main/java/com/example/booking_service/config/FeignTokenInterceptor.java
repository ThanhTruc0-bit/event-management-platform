package com.example.booking_service.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignTokenInterceptor {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

            if (attributes == null) {
                return;
            }

            HttpServletRequest request = attributes.getRequest();

            String authorization = request.getHeader("Authorization");
            String userId = request.getHeader("X-User-Id");
            String userEmail = request.getHeader("X-User-Email");
            String userRole = request.getHeader("X-User-Role");

            if (authorization != null && !authorization.isBlank()) {
                requestTemplate.header("Authorization", authorization);
            }

            if (userId != null && !userId.isBlank()) {
                requestTemplate.header("X-User-Id", userId);
            }

            if (userEmail != null && !userEmail.isBlank()) {
                requestTemplate.header("X-User-Email", userEmail);
            }

            if (userRole != null && !userRole.isBlank()) {
                requestTemplate.header("X-User-Role", userRole);
            }
        };
    }
}