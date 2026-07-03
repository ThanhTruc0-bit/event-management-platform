package com.example.api_gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class KeyResolverConfig {

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            if (exchange.getRequest().getRemoteAddress() != null) {
                String ip = exchange.getRequest()
                        .getRemoteAddress()
                        .getAddress()
                        .getHostAddress();

                return Mono.just(ip);
            }

            return Mono.just("unknown");
        };
    }
}