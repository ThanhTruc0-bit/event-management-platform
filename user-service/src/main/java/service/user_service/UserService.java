package service.user_service;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import service.user_service.dto.UserAuthResponse;
import service.user_service.dto.UserRequest;
import service.user_service.dto.UserResponse;
import service.user_service.dto.UpdateProfileRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ALLOWED_ROLES = Set.of(
            "USER",
            "ADMIN");

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "name",
            "email",
            "phone",
            "role");

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    /*
     * =====================================================
     * TÌM KIẾM + LỌC + PHÂN TRANG
     * =====================================================
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(
            String keyword,
            String role,
            int page,
            int size,
            String sortBy,
            String sortDirection) {
        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page must be greater than or equal to 0");
        }

        if (size < 1 ||
                size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "size must be between 1 and 100");
        }

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy)
                ? sortBy
                : "id";

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        direction,
                        safeSortBy));

        Specification<User> specification = (
                root,
                query,
                criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            /*
             * Tìm theo:
             * - ID
             * - Tên
             * - Email
             * - Phone
             * - Role
             */
            if (keyword != null &&
                    !keyword.isBlank()) {
                String normalizedKeyword = keyword
                        .trim()
                        .toLowerCase(Locale.ROOT);

                String likeKeyword = "%"
                        + normalizedKeyword
                        + "%";

                List<Predicate> keywordPredicates = new ArrayList<>();

                keywordPredicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(
                                        root.<String>get("name")),
                                likeKeyword));

                keywordPredicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(
                                        root.<String>get("email")),
                                likeKeyword));

                keywordPredicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(
                                        root.<String>get("phone")),
                                likeKeyword));

                keywordPredicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(
                                        root.<String>get("role")),
                                likeKeyword));

                try {
                    Long keywordId = Long.valueOf(
                            normalizedKeyword);

                    keywordPredicates.add(
                            criteriaBuilder.equal(
                                    root.get("id"),
                                    keywordId));
                } catch (NumberFormatException ignored) {
                    // Keyword không phải ID.
                }

                predicates.add(
                        criteriaBuilder.or(
                                keywordPredicates.toArray(
                                        new Predicate[0])));
            }

            /*
             * Lọc chính xác theo role.
             */
            if (role != null &&
                    !role.isBlank()) {
                predicates.add(
                        criteriaBuilder.equal(
                                criteriaBuilder.upper(
                                        root.<String>get("role")),
                                normalizeRole(role)));
            }

            return criteriaBuilder.and(
                    predicates.toArray(
                            new Predicate[0]));
        };

        return userRepository
                .findAll(
                        specification,
                        pageable)
                .map(this::toResponse);
    }

    /*
     * =====================================================
     * LẤY USER
     * =====================================================
     */

    @Transactional(readOnly = true)
    public UserResponse getUserById(
            Long id) {
        return toResponse(
                getUserEntityById(id));
    }

    /*
     * Endpoint này dành cho Auth Service.
     * Có password BCrypt để Auth Service dùng matches().
     */
    @Transactional(readOnly = true)
    public UserAuthResponse getUserByEmailForAuthentication(
            String email) {
        return toAuthResponse(
                getUserEntityByEmail(email));
    }

    /*
     * =====================================================
     * TẠO USER
     * =====================================================
     */

    @Transactional
    public UserResponse createUser(
            UserRequest request,
            boolean adminRequest) {
        validateRequest(request);

        String normalizedEmail = normalizeEmail(
                request.getEmail());

        ensureEmailAvailable(
                normalizedEmail,
                null);

        User user = new User();

        user.setName(
                validateName(
                        request.getName()));

        user.setEmail(
                normalizedEmail);

        user.setPhone(
                normalizePhone(
                        request.getPhone()));

        user.setPassword(
                passwordEncoder.encode(
                        validatePassword(
                                request.getPassword())));

        /*
         * Request từ Auth Service không có X-User-Role,
         * nên luôn tạo USER.
         *
         * Request Admin đi qua Gateway có X-User-Role=ADMIN,
         * nên mới được chọn ADMIN hoặc USER.
         */
        if (adminRequest) {
            user.setRole(
                    normalizeRole(
                            request.getRole()));
        } else {
            user.setRole("USER");
        }

        return toResponse(
                saveUser(user));
    }

    /*
     * =====================================================
     * CẬP NHẬT USER
     * =====================================================
     */

    @Transactional
    public UserResponse updateUser(
            Long id,
            UserRequest request) {
        validateRequest(request);

        User oldUser = getUserEntityById(id);

        if (request.getName() != null) {
            oldUser.setName(
                    validateName(
                            request.getName()));
        }

        if (request.getEmail() != null) {
            String normalizedEmail = normalizeEmail(
                    request.getEmail());

            ensureEmailAvailable(
                    normalizedEmail,
                    id);

            oldUser.setEmail(
                    normalizedEmail);
        }

        /*
         * Cho phép Admin xóa phone bằng cách gửi null
         * hoặc chuỗi rỗng.
         */
        oldUser.setPhone(
                normalizePhone(
                        request.getPhone()));

        if (request.getRole() != null &&
                !request.getRole().isBlank()) {
            oldUser.setRole(
                    normalizeRole(
                            request.getRole()));
        }

        /*
         * Để trống password khi sửa thì giữ password cũ.
         */
        if (request.getPassword() != null &&
                !request.getPassword().isBlank()) {
            oldUser.setPassword(
                    passwordEncoder.encode(
                            validatePassword(
                                    request.getPassword())));
        }

        return toResponse(
                saveUser(oldUser));
    }

    /*
     * =====================================================
     * XÓA USER
     * =====================================================
     */

    @Transactional
    public void deleteUser(
            Long id,
            Long currentUserId) {
        User user = getUserEntityById(id);

        if (currentUserId != null &&
                currentUserId.equals(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You cannot delete your own account");
        }

        userRepository.delete(user);
    }

    @Transactional
    public UserResponse updateProfile(
            Long userId,
            UpdateProfileRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required");
        }

        User user = getUserEntityById(userId);

        user.setName(
                validateName(
                        request.getName()));

        user.setPhone(
                normalizePhone(
                        request.getPhone()));

        return toResponse(
                saveUser(user));
    }
    /*
     * =====================================================
     * PRIVATE
     * =====================================================
     */

    private User getUserEntityById(
            Long id) {
        if (id == null ||
                id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "User ID must be greater than 0");
        }

        return userRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found: "
                                        + id));
    }

    private User getUserEntityByEmail(
            String email) {
        String normalizedEmail = normalizeEmail(email);

        return userRepository
                .findByEmailIgnoreCase(
                        normalizedEmail)
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found: "
                                        + normalizedEmail));
    }

    private void ensureEmailAvailable(
            String email,
            Long currentUserId) {
        boolean emailExists;

        if (currentUserId == null) {
            emailExists = userRepository
                    .existsByEmailIgnoreCase(
                            email);
        } else {
            emailExists = userRepository
                    .existsByEmailIgnoreCaseAndIdNot(
                            email,
                            currentUserId);
        }

        if (emailExists) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already exists: "
                            + email);
        }
    }

    private void validateRequest(
            UserRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required");
        }
    }

    private String validateName(
            String name) {
        if (name == null ||
                name.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name is required");
        }

        String normalizedName = name.trim();

        if (normalizedName.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name cannot exceed 100 characters");
        }

        return normalizedName;
    }

    private String normalizeEmail(
            String email) {
        if (email == null ||
                email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required");
        }

        String normalizedEmail = email
                .trim()
                .toLowerCase(Locale.ROOT);

        if (!normalizedEmail.matches(
                "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is invalid");
        }

        if (normalizedEmail.length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email cannot exceed 150 characters");
        }

        return normalizedEmail;
    }

    private String normalizePhone(
            String phone) {
        if (phone == null) {
            return null;
        }

        String normalizedPhone = phone.trim();

        if (normalizedPhone.isBlank()) {
            return null;
        }

        if (!normalizedPhone.matches(
                "^[0-9+() .-]{6,30}$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phone is invalid");
        }

        return normalizedPhone;
    }

    private String validatePassword(
            String password) {
        if (password == null ||
                password.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is required");
        }

        if (password.length() < 6 ||
                password.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must contain between 6 and 100 characters");
        }

        return password;
    }

    private String normalizeRole(
            String role) {
        String normalizedRole = role == null ||
                role.isBlank()
                        ? "USER"
                        : role
                                .trim()
                                .replaceFirst(
                                        "(?i)^ROLE_",
                                        "")
                                .toUpperCase(Locale.ROOT);

        if (!ALLOWED_ROLES.contains(
                normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid role: "
                            + role);
        }

        return normalizedRole;
    }

    private User saveUser(
            User user) {
        try {
            return userRepository.save(
                    user);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already exists");
        }
    }

    private UserResponse toResponse(
            User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                normalizeRole(
                        user.getRole()));
    }

    private UserAuthResponse toAuthResponse(
            User user) {
        return new UserAuthResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getPassword(),
                normalizeRole(
                        user.getRole()));
    }
}