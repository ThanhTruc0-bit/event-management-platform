package com.example.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Component
public class JwtGatewayFilter
        implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secret;

    private static final List<String> ALLOWED_ORIGINS = List.of(
            "http://localhost:5173",
            "http://localhost:5174");

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secret.getBytes(
                        StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(
            ServerWebExchange exchange,
            GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String path = request.getURI().getPath();

        HttpMethod method = request.getMethod();

        addCorsHeaders(exchange);

        /*
         * Cho phép CORS preflight.
         */
        if (method == HttpMethod.OPTIONS) {
            exchange.getResponse()
                    .setStatusCode(
                            HttpStatus.OK);

            return exchange
                    .getResponse()
                    .setComplete();
        }

        /*
         * Các API public không cần JWT.
         */
        if (isPublicPath(path, method)) {
            return chain.filter(exchange);
        }

        String authorizationHeader = request.getHeaders()
                .getFirst(
                        HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null ||
                !authorizationHeader.startsWith(
                        "Bearer ")) {
            return writeError(
                    exchange,
                    HttpStatus.UNAUTHORIZED,
                    "Missing Authorization token");
        }

        String token = authorizationHeader
                .substring(7)
                .trim();

        if (token.isBlank()) {
            return writeError(
                    exchange,
                    HttpStatus.UNAUTHORIZED,
                    "Authorization token is empty");
        }

        Claims claims;

        try {
            claims = Jwts.parser()
                    .verifyWith(
                            getSigningKey())
                    .build()
                    .parseSignedClaims(
                            token)
                    .getPayload();
        } catch (Exception exception) {
            return writeError(
                    exchange,
                    HttpStatus.UNAUTHORIZED,
                    "Invalid or expired token");
        }

        Long userId = getUserId(claims);

        String email = getEmail(claims);

        String role = getRole(claims);

        if (userId == null) {
            return writeError(
                    exchange,
                    HttpStatus.UNAUTHORIZED,
                    "Token userId is missing");
        }

        if (role == null ||
                role.isBlank()) {
            return writeError(
                    exchange,
                    HttpStatus.UNAUTHORIZED,
                    "Token role is missing");
        }

        /*
         * Kiểm tra quyền ADMIN tại Gateway.
         */
        if (isAdminOnlyApi(
                path,
                method) &&
                !"ADMIN".equals(role)) {
            return writeError(
                    exchange,
                    HttpStatus.FORBIDDEN,
                    "ADMIN role required");
        }

        /*
         * Xóa các header do client tự gửi lên,
         * sau đó tạo lại từ JWT đã xác thực.
         *
         * Như vậy user không thể tự giả mạo
         * X-User-Id hoặc X-User-Role.
         */
        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove(
                            "X-User-Id");

                    headers.remove(
                            "X-User-Email");

                    headers.remove(
                            "X-User-Role");

                    headers.set(
                            "X-User-Id",
                            String.valueOf(
                                    userId));

                    headers.set(
                            "X-User-Email",
                            email);

                    headers.set(
                            "X-User-Role",
                            role);
                })
                .build();

        ServerWebExchange mutatedExchange = exchange.mutate()
                .request(
                        mutatedRequest)
                .build();

        return chain.filter(
                mutatedExchange);
    }

    /*
     * =====================================================
     * CORS
     * =====================================================
     */
    private void addCorsHeaders(
            ServerWebExchange exchange) {
        String origin = exchange.getRequest()
                .getHeaders()
                .getOrigin();

        if (origin == null ||
                !ALLOWED_ORIGINS.contains(
                        origin)) {
            return;
        }

        HttpHeaders headers = exchange.getResponse()
                .getHeaders();

        headers.set(
                "Access-Control-Allow-Origin",
                origin);

        headers.set(
                "Access-Control-Allow-Credentials",
                "true");

        headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, PATCH, OPTIONS");

        headers.set(
                "Access-Control-Allow-Headers",
                "Authorization, Content-Type, Accept, Origin, X-Requested-With");

        headers.set(
                "Access-Control-Max-Age",
                "3600");

        headers.set(
                "Vary",
                "Origin");
    }

    /*
     * =====================================================
     * PATH HELPERS
     * =====================================================
     */
    private String normalizePath(
            String path) {
        if (path == null) {
            return "";
        }

        String normalized = path.trim()
                .toLowerCase();

        /*
         * Frontend có thể gọi qua /api.
         */
        if (normalized.startsWith(
                "/api/")) {
            normalized = normalized.substring(4);
        }

        if (normalized.length() > 1 &&
                normalized.endsWith("/")) {
            normalized = normalized.substring(
                    0,
                    normalized.length() - 1);
        }

        return normalized;
    }

    /*
     * =====================================================
     * PUBLIC APIS
     * =====================================================
     */
    private boolean isPublicPath(
            String path,
            HttpMethod method) {
        if (path == null ||
                method == null) {
            return false;
        }

        String normalizedPath = normalizePath(path);

        /*
         * Auth API.
         */
        if (normalizedPath.startsWith(
                "/auth-service/auth/register") ||
                normalizedPath.startsWith(
                        "/auth-service/auth/login")
                ||
                normalizedPath.startsWith(
                        "/auth-service/auth/refresh-token")
                ||
                normalizedPath.startsWith(
                        "/auth-service/auth/logout")) {
            return true;
        }

        /*
         * Swagger.
         */
        if (normalizedPath.contains(
                "/swagger-ui") ||
                normalizedPath.contains(
                        "/v3/api-docs")
                ||
                normalizedPath.equals(
                        "/swagger-ui.html")) {
            return true;
        }

        if (method != HttpMethod.GET) {
            return false;
        }

        /*
         * Event công khai.
         */
        if (normalizedPath.equals(
                "/event-service/events") ||
                normalizedPath.startsWith(
                        "/event-service/events/")) {
            return true;
        }

        /*
         * Event category công khai.
         */
        if (normalizedPath.equals(
                "/event-service/event-categories") ||
                normalizedPath.startsWith(
                        "/event-service/event-categories/")) {
            return true;
        }

        /*
         * Ảnh event công khai.
         */
        if (normalizedPath.startsWith(
                "/event-service/uploads/")) {
            return true;
        }

        /*
         * Danh sách ghế sự kiện công khai.
         */
        if (normalizedPath.startsWith(
                "/seat-service/seats/event/")) {
            return true;
        }

        /*
         * VNPay redirect về trình duyệt.
         */
        return normalizedPath.startsWith(
                "/payment-service/payments/vnpay-return");
    }

    /*
     * =====================================================
     * USER PAYMENT API
     * =====================================================
     */
    private boolean isUserPaymentApi(
            String path,
            HttpMethod method) {
        if (path == null ||
                method == null) {
            return false;
        }

        String normalizedPath = normalizePath(path);

        /*
         * USER được thanh toán booking.
         */
        return method == HttpMethod.POST &&
                normalizedPath.matches(
                        "^/payment-service/payments/booking/\\d+/vnpay$");
    }

    /*
     * =====================================================
     * USER NOTIFICATION APIS
     * =====================================================
     */
    private boolean isUserNotificationApi(
            String path,
            HttpMethod method) {
        if (path == null ||
                method == null) {
            return false;
        }

        String normalizedPath = normalizePath(path);

        /*
         * User đánh dấu một thông báo đã đọc.
         */
        boolean markOneRead = method == HttpMethod.PUT &&
                normalizedPath.matches(
                        "^/notification-service/notifications/\\d+/read$");

        /*
         * User chuyển một thông báo về chưa đọc.
         */
        boolean markOneUnread = method == HttpMethod.PUT &&
                normalizedPath.matches(
                        "^/notification-service/notifications/\\d+/unread$");

        /*
         * User đánh dấu toàn bộ thông báo của mình đã đọc.
         */
        boolean markAllRead = method == HttpMethod.PUT &&
                normalizedPath.matches(
                        "^/notification-service/notifications/user/\\d+/read-all$");

        /*
         * User xóa thông báo thuộc tài khoản của mình.
         * Notification Service vẫn kiểm tra chủ sở hữu.
         */
        boolean deleteOwnNotification = method == HttpMethod.DELETE &&
                normalizedPath.matches(
                        "^/notification-service/notifications/\\d+$");

        return markOneRead ||
                markOneUnread ||
                markAllRead ||
                deleteOwnNotification;
    }

    /*
     * =====================================================
     * ADMIN ONLY APIS
     * =====================================================
     */
    private boolean isAdminOnlyApi(
            String path,
            HttpMethod method) {
        if (path == null ||
                method == null) {
            return false;
        }

        String normalizedPath = normalizePath(path);

        boolean isWriteMethod = method == HttpMethod.POST ||
                method == HttpMethod.PUT ||
                method == HttpMethod.PATCH ||
                method == HttpMethod.DELETE;

        /*
         * User được phép tạo thanh toán VNPay.
         */
        if (isUserPaymentApi(
                path,
                method)) {
            return false;
        }

        /*
         * User được phép đọc, chuyển chưa đọc,
         * đọc tất cả và xóa thông báo của mình.
         *
         * Notification Service sẽ kiểm tra:
         * X-User-Id == notification.userId.
         */
        if (isUserNotificationApi(
                path,
                method)) {
            return false;
        }

        /*
         * Quản lý user chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/user-service/users")) {
            return true;
        }

        /*
         * Ghi Event chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/event-service/events") &&
                isWriteMethod) {
            return true;
        }

        /*
         * Ghi Event Category chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/event-service/event-categories") &&
                isWriteMethod) {
            return true;
        }

        /*
         * Ghi Seat chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/seat-service/seats") &&
                isWriteMethod) {
            return true;
        }

        /*
         * Ghi Ticket chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/ticket-service/tickets") &&
                isWriteMethod) {
            return true;
        }

        /*
         * Các Payment write khác ngoài API tạo
         * VNPay của user chỉ dành cho ADMIN.
         */
        if (normalizedPath.startsWith(
                "/payment-service/payments") &&
                isWriteMethod) {
            return true;
        }

        /*
         * Tạo thông báo thủ công và các API ghi
         * khác chỉ dành cho ADMIN.
         *
         * Các API của user đã được loại trừ ở trên.
         */
        return normalizedPath.startsWith(
                "/notification-service/notifications") && isWriteMethod;
    }

    /*
     * =====================================================
     * JWT CLAIM HELPERS
     * =====================================================
     */
    private Long getUserId(
            Claims claims) {
        Object rawUserId = claims.get("userId");

        if (rawUserId == null) {
            rawUserId = claims.get("id");
        }

        if (rawUserId == null) {
            rawUserId = claims.get("uid");
        }

        if (rawUserId == null) {
            return null;
        }

        if (rawUserId instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.valueOf(
                    String.valueOf(
                            rawUserId));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String getEmail(
            Claims claims) {
        Object rawEmail = claims.get("email");

        if (rawEmail == null) {
            return "";
        }

        return String.valueOf(
                rawEmail).trim();
    }

    private String getRole(
            Claims claims) {
        Object rawRole = claims.get("role");

        if (rawRole == null) {
            rawRole = claims.get("roles");
        }

        if (rawRole == null) {
            return null;
        }

        /*
         * Token có roles dạng mảng.
         */
        if (rawRole instanceof Collection<?> collection) {
            if (collection.isEmpty()) {
                return null;
            }

            rawRole = collection.iterator()
                    .next();
        }

        /*
         * Token có role dạng object:
         * {roleName: "USER"}.
         */
        if (rawRole instanceof Map<?, ?> roleMap) {
            Object roleName = roleMap.get(
                    "roleName");

            if (roleName == null) {
                roleName = roleMap.get(
                        "name");
            }

            if (roleName == null) {
                roleName = roleMap.get(
                        "authority");
            }

            rawRole = roleName;
        }

        if (rawRole == null) {
            return null;
        }

        String normalizedRole = String.valueOf(rawRole)
                .trim()
                .toUpperCase();

        if (normalizedRole.startsWith(
                "ROLE_")) {
            normalizedRole = normalizedRole.substring(5);
        }

        return normalizedRole;
    }

    /*
     * =====================================================
     * ERROR RESPONSE
     * =====================================================
     */
    private Mono<Void> writeError(
            ServerWebExchange exchange,
            HttpStatus status,
            String message) {
        addCorsHeaders(exchange);

        exchange.getResponse()
                .setStatusCode(status);

        exchange.getResponse()
                .getHeaders()
                .setContentType(
                        MediaType.APPLICATION_JSON);

        String safeMessage = message == null
                ? ""
                : message.replace(
                        "\"",
                        "\\\"");

        String body = """
                {
                  "status": %d,
                  "error": "%s",
                  "message": "%s"
                }
                """.formatted(
                status.value(),
                status.getReasonPhrase(),
                safeMessage);

        byte[] bytes = body.getBytes(
                StandardCharsets.UTF_8);

        return exchange
                .getResponse()
                .writeWith(
                        Mono.just(
                                exchange
                                        .getResponse()
                                        .bufferFactory()
                                        .wrap(bytes)));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}