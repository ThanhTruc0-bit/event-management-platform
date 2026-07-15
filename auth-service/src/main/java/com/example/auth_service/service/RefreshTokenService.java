package com.example.auth_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final String KEY_PREFIX =
            "refresh_token:";

    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.refresh-token-expiration-ms}")
    private Long refreshTokenExpirationMs;

    public RefreshTokenService(
            StringRedisTemplate redisTemplate
    ) {
        this.redisTemplate = redisTemplate;
    }

    private String key(String refreshToken) {
        return KEY_PREFIX + refreshToken;
    }

    public String createRefreshToken(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }

        String refreshToken =
                UUID.randomUUID().toString();

        redisTemplate.opsForValue().set(
                key(refreshToken),
                String.valueOf(userId),
                Duration.ofMillis(
                        refreshTokenExpirationMs
                )
        );

        return refreshToken;
    }

    public Long validateRefreshToken(
            String refreshToken
    ) {
        if (refreshToken == null
                || refreshToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token is required"
            );
        }

        String normalizedToken =
                refreshToken.trim();

        String userId = redisTemplate
                .opsForValue()
                .get(key(normalizedToken));

        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token invalid or expired"
            );
        }

        try {
            return Long.valueOf(userId);
        } catch (NumberFormatException exception) {
            redisTemplate.delete(
                    key(normalizedToken)
            );

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token is invalid"
            );
        }
    }

    public void deleteRefreshToken(
            String refreshToken
    ) {
        if (refreshToken == null
                || refreshToken.isBlank()) {
            return;
        }

        redisTemplate.delete(
                key(refreshToken.trim())
        );
    }
}