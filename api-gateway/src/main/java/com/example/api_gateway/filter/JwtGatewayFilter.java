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

@Component
public class JwtGatewayFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        if (method == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        if (isPublicPath(path)) {
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
                .header("X-User-Id", String.valueOf(userId))
                .header("X-User-Email", email == null ? "" : email)
                .header("X-User-Role", role)
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/auth-service/auth/register")
                || path.startsWith("/auth-service/auth/login")
                || path.startsWith("/auth-service/auth/refresh-token")
                || path.startsWith("/auth-service/auth/logout")
                || path.contains("/swagger-ui")
                || path.contains("/v3/api-docs")
                || path.equals("/swagger-ui.html");
    }

    private boolean isAdminOnlyApi(String path, HttpMethod method) {
        if (method == null) {
            return false;
        }

        boolean isWriteMethod = method == HttpMethod.POST
                || method == HttpMethod.PUT
                || method == HttpMethod.PATCH
                || method == HttpMethod.DELETE;

        if (path.startsWith("/user-service/users")) {
            return true;
        }

        if (path.startsWith("/event-service/events") && isWriteMethod) {
            return true;
        }

        if (path.startsWith("/seat-service/seats") && isWriteMethod) {
            return true;
        }

        if (path.startsWith("/ticket-service/tickets") && isWriteMethod) {
            return true;
        }

        if (path.startsWith("/payment-service/payments") && isWriteMethod) {
            return true;
        }

        if (path.startsWith("/notification-service/notifications") && isWriteMethod) {
            return true;
        }

        return false;
    }

    private Long getUserId(Claims claims) {
        Object userId = claims.get("userId");

        if (userId instanceof Integer) {
            return ((Integer) userId).longValue();
        }

        if (userId instanceof Long) {
            return (Long) userId;
        }

        return Long.valueOf(String.valueOf(userId));
    }

    private Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String message) {
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
        return -1;
    }
}