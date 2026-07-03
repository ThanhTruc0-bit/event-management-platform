package com.example.auth_service.feign;

import com.example.auth_service.dto.RegisterRequest;
import com.example.auth_service.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/users/{id}")
    UserDTO getUserById(@PathVariable Long id);

    @GetMapping("/users/email/{email}")
    UserDTO getUserByEmail(@PathVariable String email);

    @PostMapping("/users")
    UserDTO createUser(@RequestBody RegisterRequest request);
}