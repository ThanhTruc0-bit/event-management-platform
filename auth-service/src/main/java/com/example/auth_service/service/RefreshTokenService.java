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

    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.refresh-token-expiration-ms}")
    private Long refreshTokenExpirationMs;

    public RefreshTokenService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private String key(String refreshToken) {
        return "refresh_token:" + refreshToken;
    }

    public String createRefreshToken(Long userId) {
        String refreshToken = UUID.randomUUID().toString();

        redisTemplate.opsForValue().set(
                key(refreshToken),
                String.valueOf(userId),
                Duration.ofMillis(refreshTokenExpirationMs)
        );

        return refreshToken;
    }

    public Long validateRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token is required"
            );
        }

        String userId = redisTemplate.opsForValue().get(key(refreshToken));

        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token invalid or expired"
            );
        }

        return Long.valueOf(userId);
    }

    public void deleteRefreshToken(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            redisTemplate.delete(key(refreshToken));
        }
    }
}