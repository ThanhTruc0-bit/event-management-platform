package com.example.booking_service.fallback;

import com.example.booking_service.dto.UserDTO;
import com.example.booking_service.feign.UserClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class UserClientFallback implements UserClient {

    @Override
    public UserDTO getUserById(Long id) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "User Service is unavailable. Cannot get user: "
                        + id);
    }
}