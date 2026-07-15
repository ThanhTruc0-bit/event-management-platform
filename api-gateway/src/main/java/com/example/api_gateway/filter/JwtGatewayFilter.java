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
import java.util.List;

@Component
public class JwtGatewayFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secret;

    private static final List<String> ALLOWED_ORIGINS = List.of(
            "http://localhost:5173",
            "http://localhost:5174");

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        addCorsHeaders(exchange);

        if (method == HttpMethod.OPTIONS) {
            exchange.getResponse().setStatusCode(HttpStatus.OK);
            return exchange.getResponse().setComplete();
        }

        if (isPublicPath(path, method)) {
            return chain.filter(exchange);
        }

        String authorizationHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return writeError(exchange, HttpStatus.UNAUTHORIZED, "Missing Authorization token");
        }

        String token = authorizationHeader.substring(7);

        Claims claims;

        try {
            claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            return writeError(exchange, HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }

        Long userId = getUserId(claims);
        String email = claims.get("email", String.class);
        String role = claims.get("role", String.class);

        if (role == null || role.isBlank()) {
            return writeError(exchange, HttpStatus.UNAUTHORIZED, "Token role is missing");
        }

        role = role.toUpperCase();

        if (isAdminOnlyApi(path, method) && !"ADMIN".equals(role)) {
            return writeError(exchange, HttpStatus.FORBIDDEN, "ADMIN role required");
        }

        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", userId == null ? "" : String.valueOf(userId))
                .header("X-User-Email", email == null ? "" : email)
                .header("X-User-Role", role)
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private void addCorsHeaders(ServerWebExchange exchange) {
        String origin = exchange.getRequest().getHeaders().getOrigin();

        if (origin != null && ALLOWED_ORIGINS.contains(origin)) {
            HttpHeaders headers = exchange.getResponse().getHeaders();

            headers.set("Access-Control-Allow-Origin", origin);
            headers.set("Access-Control-Allow-Credentials", "true");
            headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");

            String requestHeaders = exchange.getRequest()
                    .getHeaders()
                    .getFirst("Access-Control-Request-Headers");

            if (requestHeaders != null && !requestHeaders.isBlank()) {
                headers.set("Access-Control-Allow-Headers", requestHeaders);
            } else {
                headers.set(
                        "Access-Control-Allow-Headers",
                        "Authorization, Content-Type, Accept, Origin, X-Requested-With, X-User-Id, X-User-Email, X-User-Role");
            }

            headers.set("Access-Control-Max-Age", "3600");
            headers.set("Vary", "Origin");
        }
    }

    private String normalizePath(String path) {
        if (path == null) {
            return "";
        }

        String lowerPath = path.toLowerCase();

        if (lowerPath.startsWith("/api/")) {
            lowerPath = lowerPath.substring(4);
        }

        if (lowerPath.length() > 1 && lowerPath.endsWith("/")) {
            lowerPath = lowerPath.substring(0, lowerPath.length() - 1);
        }

        return lowerPath;
    }

    private boolean isPublicPath(String path, HttpMethod method) {
        if (path == null || method == null) {
            return false;
        }

        String lowerPath = normalizePath(path);

        if (lowerPath.startsWith("/auth-service/auth/register")
                || lowerPath.startsWith("/auth-service/auth/login")
                || lowerPath.startsWith("/auth-service/auth/refresh-token")
                || lowerPath.startsWith("/auth-service/auth/logout")) {
            return true;
        }

        if (lowerPath.contains("/swagger-ui")
                || lowerPath.contains("/v3/api-docs")
                || lowerPath.equals("/swagger-ui.html")) {
            return true;
        }

        if (method == HttpMethod.GET) {
            if (lowerPath.equals("/event-service/events")
                    || lowerPath.startsWith("/event-service/events/")) {
                return true;
            }

            if (lowerPath.equals("/event-service/event-categories")
                    || lowerPath.startsWith("/event-service/event-categories/")) {
                return true;
            }

            if (lowerPath.startsWith("/event-service/uploads/")) {
                return true;
            }

            if (lowerPath.startsWith("/seat-service/seats/event/")) {
                return true;
            }

            if (lowerPath.startsWith("/payment-service/payments/vnpay-return")) {
                return true;
            }
        }

        return false;
    }

    private boolean isUserPaymentApi(String path, HttpMethod method) {
        if (path == null || method == null) {
            return false;
        }

        String lowerPath = normalizePath(path);

        return method == HttpMethod.POST
                && lowerPath.matches("^/payment-service/payments/booking/\\d+/vnpay$");
    }

    private boolean isAdminOnlyApi(String path, HttpMethod method) {
        if (path == null || method == null) {
            return false;
        }

        String lowerPath = normalizePath(path);

        boolean isWriteMethod = method == HttpMethod.POST
                || method == HttpMethod.PUT
                || method == HttpMethod.PATCH
                || method == HttpMethod.DELETE;

        /*
         * USER được phép gọi API này để thanh toán booking của chính mình:
         * POST /payment-service/payments/booking/{bookingId}/vnpay
         */
        if (isUserPaymentApi(path, method)) {
            return false;
        }

        if (lowerPath.startsWith("/user-service/users")) {
            return true;
        }

        if (lowerPath.startsWith("/event-service/events") && isWriteMethod) {
            return true;
        }

        if (lowerPath.startsWith("/event-service/event-categories") && isWriteMethod) {
            return true;
        }

        if (lowerPath.startsWith("/seat-service/seats") && isWriteMethod) {
            return true;
        }

        if (lowerPath.startsWith("/ticket-service/tickets") && isWriteMethod) {
            return true;
        }

        if (lowerPath.startsWith("/payment-service/payments") && isWriteMethod) {
            return true;
        }

        if (lowerPath.startsWith("/notification-service/notifications") && isWriteMethod) {
            return true;
        }

        return false;
    }

    private Long getUserId(Claims claims) {
        Object userId = claims.get("userId");

        if (userId == null) {
            return null;
        }

        if (userId instanceof Integer) {
            return ((Integer) userId).longValue();
        }

        if (userId instanceof Long) {
            return (Long) userId;
        }

        return Long.valueOf(String.valueOf(userId));
    }

    private Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String message) {
        addCorsHeaders(exchange);

        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {
                  "status": %d,
                  "error": "%s",
                  "message": "%s"
                }
                """.formatted(status.value(), status.getReasonPhrase(), message);

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        return exchange.getResponse().writeWith(
                Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}