package com.example.booking_service.fallback;

import com.example.booking_service.dto.UserDTO;
import com.example.booking_service.feign.UserClient;
import org.springframework.stereotype.Component;

@Component
public class UserClientFallback implements UserClient {

    @Override
    public UserDTO getUserById(Long id) {
        throw new RuntimeException("User service is unavailable. Cannot get user: " + id);
    }
}