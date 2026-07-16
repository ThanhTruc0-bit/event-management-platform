package service.user_service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import service.user_service.dto.UserAuthResponse;
import service.user_service.dto.UserRequest;
import service.user_service.dto.UserResponse;
import service.user_service.dto.UpdateProfileRequest;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private static final String USER_ID_HEADER = "X-User-Id";

    private static final String USER_ROLE_HEADER = "X-User-Role";

    private final UserService userService;

    /*
     * ADMIN:
     *
     * GET /users?page=0&size=10
     * GET /users?keyword=nguyen
     * GET /users?role=ADMIN
     * GET /users?sortBy=name&sortDirection=asc
     */
    @GetMapping
    public Page<UserResponse> searchUsers(
            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) String role,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size,

            @RequestParam(defaultValue = "id") String sortBy,

            @RequestParam(defaultValue = "desc") String sortDirection,

            @RequestHeader(value = USER_ROLE_HEADER, required = false) String currentRole) {
        requireAdmin(currentRole);

        return userService.searchUsers(
                keyword,
                role,
                page,
                size,
                sortBy,
                sortDirection);
    }

    /*
     * Booking Service, Auth Service và service khác
     * có thể dùng endpoint này.
     *
     * Không trả password.
     */
    @GetMapping("/{id}")
    public UserResponse getUserById(
            @PathVariable Long id) {
        return userService.getUserById(id);
    }

    /*
     * Dành cho Auth Service đăng nhập.
     * Auth Service cần password BCrypt để matches().
     *
     * Không gọi endpoint này từ frontend.
     * Không public trực tiếp port user-service.
     */
    @GetMapping("/email/{email}")
    public UserAuthResponse getUserByEmail(
            @PathVariable String email) {
        return userService
                .getUserByEmailForAuthentication(
                        email);
    }

    /*
     * Auth Service gọi endpoint này không có header ADMIN:
     * => luôn tạo USER.
     *
     * Admin frontend đi qua Gateway có X-User-Role=ADMIN:
     * => được chọn USER hoặc ADMIN.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(
            @RequestBody UserRequest request,

            @RequestHeader(value = USER_ROLE_HEADER, required = false) String currentRole) {
        return userService.createUser(
                request,
                isAdmin(currentRole));
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(
            @PathVariable Long id,

            @RequestBody UserRequest request,

            @RequestHeader(value = USER_ROLE_HEADER, required = false) String currentRole) {
        requireAdmin(currentRole);

        return userService.updateUser(
                id,
                request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(
            @PathVariable Long id,

            @RequestHeader(value = USER_ID_HEADER, required = false) Long currentUserId,

            @RequestHeader(value = USER_ROLE_HEADER, required = false) String currentRole) {
        requireAdmin(currentRole);

        userService.deleteUser(
                id,
                currentUserId);
    }

    @PutMapping("/{id}/profile")
    public UserResponse updateProfile(
            @PathVariable Long id,

            @RequestBody UpdateProfileRequest request,

            @RequestHeader(value = USER_ID_HEADER, required = false) Long currentUserId,

            @RequestHeader(value = USER_ROLE_HEADER, required = false) String currentRole) {
        if (currentUserId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required");
        }

        boolean admin = isAdmin(currentRole);

        boolean isOwner = id.equals(currentUserId);

        if (!admin && !isOwner) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot update another user's profile");
        }

        return userService.updateProfile(
                id,
                request);
    }

    private void requireAdmin(
            String role) {
        if (!isAdmin(role)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "ADMIN role is required");
        }
    }

    private boolean isAdmin(
            String role) {
        if (role == null ||
                role.isBlank()) {
            return false;
        }

        String normalizedRole = role
                .trim()
                .toUpperCase();

        return "ADMIN".equals(
                normalizedRole)
                || "ROLE_ADMIN".equals(
                        normalizedRole);
    }
}