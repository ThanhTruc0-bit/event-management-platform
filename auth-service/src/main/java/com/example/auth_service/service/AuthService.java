package com.example.auth_service.service;

import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LogoutRequest;
import com.example.auth_service.dto.RefreshTokenRequest;
import com.example.auth_service.dto.RegisterRequest;
import com.example.auth_service.dto.TokenResponse;
import com.example.auth_service.dto.UserDTO;
import com.example.auth_service.feign.UserClient;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.example.auth_service.dto.UpdateProfileRequest;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserClient userClient;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;

    public UserDTO register(RegisterRequest request) {
        validateRegisterRequest(request);

        request.setName(request.getName().trim());
        request.setEmail(normalizeEmail(request.getEmail()));
        request.setPhone(normalizeNullableValue(request.getPhone()));

        /*
         * Tuyệt đối không tin role do frontend gửi lên.
         * API đăng ký công khai chỉ được tạo USER.
         */
        request.setRole("USER");

        try {
            UserDTO existingUser =
                    userClient.getUserByEmail(request.getEmail());

            if (existingUser != null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email already exists"
                );
            }
        } catch (FeignException.NotFound ignored) {
            // Email chưa tồn tại, cho phép đăng ký.
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (FeignException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "User Service is unavailable"
            );
        }

        try {
            UserDTO createdUser =
                    userClient.createUser(request);

            if (createdUser == null) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Cannot create user"
                );
            }

            return sanitizeUser(createdUser);
        } catch (FeignException.Conflict exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already exists"
            );
        } catch (FeignException.BadRequest exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    extractFeignMessage(
                            exception,
                            "Invalid user information"
                    )
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (FeignException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "User Service is unavailable"
            );
        }
    }

    public TokenResponse login(LoginRequest request) {
        validateLoginRequest(request);

        String email = normalizeEmail(request.getEmail());

        UserDTO user;

        try {
            user = userClient.getUserByEmail(email);
        } catch (FeignException.NotFound exception) {
            throw invalidCredentials();
        } catch (FeignException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "User Service is unavailable"
            );
        }

        if (user == null
                || user.getPassword() == null
                || user.getPassword().isBlank()) {
            throw invalidCredentials();
        }

        boolean validPassword;

        try {
            validPassword = passwordEncoder.matches(
                    request.getPassword(),
                    user.getPassword()
            );
        } catch (Exception exception) {
            validPassword = false;
        }

        if (!validPassword) {
            throw invalidCredentials();
        }

        user.setEmail(normalizeEmail(user.getEmail()));
        user.setRole(normalizeRole(user.getRole()));

        String accessToken =
                jwtService.generateAccessToken(user);

        String refreshToken =
                refreshTokenService.createRefreshToken(
                        user.getId()
                );

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public TokenResponse refreshToken(
            RefreshTokenRequest request
    ) {
        if (request == null
                || request.getRefreshToken() == null
                || request.getRefreshToken().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token is required"
            );
        }

        String oldRefreshToken =
                request.getRefreshToken().trim();

        Long userId =
                refreshTokenService.validateRefreshToken(
                        oldRefreshToken
                );

        UserDTO user;

        try {
            user = userClient.getUserById(userId);
        } catch (FeignException.NotFound exception) {
            refreshTokenService.deleteRefreshToken(
                    oldRefreshToken
            );

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not found"
            );
        } catch (FeignException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "User Service is unavailable"
            );
        }

        if (user == null) {
            refreshTokenService.deleteRefreshToken(
                    oldRefreshToken
            );

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not found"
            );
        }

        user.setEmail(normalizeEmail(user.getEmail()));
        user.setRole(normalizeRole(user.getRole()));

        /*
         * Refresh token rotation:
         * xóa token cũ và tạo token mới.
         */
        refreshTokenService.deleteRefreshToken(
                oldRefreshToken
        );

        String newAccessToken =
                jwtService.generateAccessToken(user);

        String newRefreshToken =
                refreshTokenService.createRefreshToken(
                        user.getId()
                );

        return new TokenResponse(
                newAccessToken,
                newRefreshToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public void logout(LogoutRequest request) {
        if (request == null) {
            return;
        }

        refreshTokenService.deleteRefreshToken(
                request.getRefreshToken()
        );
    }

    public UserDTO profile(String authorizationHeader) {
        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Token is required"
            );
        }

        String token = authorizationHeader
                .substring(7)
                .trim();

        if (token.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Token is required"
            );
        }

        Long userId =
                jwtService.getUserIdFromToken(token);

        try {
            UserDTO user =
                    userClient.getUserById(userId);

            if (user == null) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User not found"
                );
            }

            return sanitizeUser(user);
        } catch (FeignException.NotFound exception) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not found"
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (FeignException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "User Service is unavailable"
            );
        }
    }
    public UserDTO updateProfile(
        String authorizationHeader,
        UpdateProfileRequest request
) {
    if (request == null) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Request body is required"
        );
    }

    if (
            request.getName() == null ||
            request.getName().isBlank()
    ) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Name is required"
        );
    }

    String normalizedName =
            request.getName().trim();

    if (normalizedName.length() > 100) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Name cannot exceed 100 characters"
        );
    }

    String normalizedPhone =
            normalizeNullableValue(
                    request.getPhone()
            );

    if (
            normalizedPhone != null &&
            !normalizedPhone.matches(
                    "^[0-9+() .-]{6,30}$"
            )
    ) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Phone is invalid"
        );
    }

    Long userId =
            getUserIdFromAuthorizationHeader(
                    authorizationHeader
            );

    request.setName(
            normalizedName
    );

    request.setPhone(
            normalizedPhone
    );

    try {
        UserDTO updatedUser =
                userClient.updateProfile(
                        userId,
                        request,
                        userId
                );

        if (updatedUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cannot update profile"
            );
        }

        return sanitizeUser(
                updatedUser
        );
    } catch (
            FeignException.BadRequest exception
    ) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                extractFeignMessage(
                        exception,
                        "Invalid profile information"
                )
        );
    } catch (
            FeignException.Forbidden exception
    ) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "You cannot update this profile"
        );
    } catch (
            FeignException.NotFound exception
    ) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "User not found"
        );
    } catch (
            ResponseStatusException exception
    ) {
        throw exception;
    } catch (
            FeignException exception
    ) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "User Service is unavailable"
        );
    }
}
    private void validateRegisterRequest(
            RegisterRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }

        if (request.getName() == null
                || request.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name is required"
            );
        }

        if (request.getEmail() == null
                || request.getEmail().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required"
            );
        }

        if (!request.getEmail().contains("@")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is invalid"
            );
        }

        if (request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is required"
            );
        }

        if (request.getPassword().length() < 6) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must contain at least 6 characters"
            );
        }
    }

    private void validateLoginRequest(
            LoginRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }

        if (request.getEmail() == null
                || request.getEmail().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required"
            );
        }

        if (request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is required"
            );
        }
    }

    private UserDTO sanitizeUser(UserDTO user) {
        user.setPassword(null);
        user.setEmail(normalizeEmail(user.getEmail()));
        user.setRole(normalizeRole(user.getRole()));

        return user;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }

        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "USER";
        }

        String normalizedRole = role
                .trim()
                .toUpperCase(Locale.ROOT);

        if (normalizedRole.startsWith("ROLE_")) {
            normalizedRole =
                    normalizedRole.substring(5);
        }

        return "ADMIN".equals(normalizedRole)
                ? "ADMIN"
                : "USER";
    }

    private String normalizeNullableValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isBlank()
                ? null
                : normalized;
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        );
    }
    private Long getUserIdFromAuthorizationHeader(
        String authorizationHeader
) {
    if (
            authorizationHeader == null ||
            !authorizationHeader.startsWith(
                    "Bearer "
            )
    ) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Token is required"
        );
    }

    String token =
            authorizationHeader
                    .substring(7)
                    .trim();

    if (token.isBlank()) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Token is required"
        );
    }

    return jwtService
            .getUserIdFromToken(token);
}
    private String extractFeignMessage(
            FeignException exception,
            String defaultMessage
    ) {
        String responseBody =
                exception.contentUTF8();

        if (responseBody == null
                || responseBody.isBlank()) {
            return defaultMessage;
        }

        return responseBody;
    }
}