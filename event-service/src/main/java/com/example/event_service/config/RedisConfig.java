package com.example.event_service.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

@Configuration
public class RedisConfig {

        @Bean
        public CacheManager cacheManager(
                        RedisConnectionFactory connectionFactory) {
                BasicPolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
                                .allowIfSubType("com.example.event_service")
                                .allowIfSubType("java.util")
                                .allowIfSubType("java.time")
                                .build();

                ObjectMapper objectMapper = new ObjectMapper();

                objectMapper.registerModule(
                                new JavaTimeModule());

                objectMapper.disable(
                                SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

                objectMapper.activateDefaultTyping(
                                typeValidator,
                                ObjectMapper.DefaultTyping.NON_FINAL,
                                JsonTypeInfo.As.PROPERTY);

                GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(
                                objectMapper);

                RedisCacheConfiguration configuration = RedisCacheConfiguration
                                .defaultCacheConfig()
                                .entryTtl(
                                                Duration.ofMinutes(10))
                                .disableCachingNullValues()
                                .serializeValuesWith(
                                                RedisSerializationContext.SerializationPair
                                                                .fromSerializer(
                                                                                serializer));

                return RedisCacheManager
                                .builder(connectionFactory)
                                .cacheDefaults(configuration)
                                .build();
        }
}