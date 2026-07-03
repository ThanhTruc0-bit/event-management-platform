package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.feign.UserClient;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserClient userClient;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;

    public UserDTO register(RegisterRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (request.getRole() == null || request.getRole().isBlank()) {
            request.setRole("USER");
        }

        try {
            UserDTO existingUser = userClient.getUserByEmail(request.getEmail());

            if (existingUser != null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email already exists"
                );
            }
        } catch (FeignException.NotFound ignored) {
            // Email chưa tồn tại thì cho đăng ký
        }

        // KHÔNG encode ở auth-service
        // user-service sẽ encode password trước khi lưu database

        return userClient.createUser(request);
    }

    public TokenResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        UserDTO user;

        try {
            user = userClient.getUserByEmail(request.getEmail());
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        if (user == null || user.getPassword() == null || user.getPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        boolean validPassword = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!validPassword) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId());

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public TokenResponse refreshToken(RefreshTokenRequest request) {
        Long userId = refreshTokenService.validateRefreshToken(request.getRefreshToken());

        UserDTO user;

        try {
            user = userClient.getUserById(userId);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }

        String newAccessToken = jwtService.generateAccessToken(user);

        return new TokenResponse(
                newAccessToken,
                request.getRefreshToken(),
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public void logout(LogoutRequest request) {
        refreshTokenService.deleteRefreshToken(request.getRefreshToken());
    }

    public UserDTO profile(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token is required");
        }

        String token = authorizationHeader.substring(7);
        Long userId = jwtService.getUserIdFromToken(token);

        try {
            return userClient.getUserById(userId);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found");
        }
    }
}