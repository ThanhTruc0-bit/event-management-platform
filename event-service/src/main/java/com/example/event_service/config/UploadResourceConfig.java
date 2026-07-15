package com.example.event_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class UploadResourceConfig
        implements WebMvcConfigurer {

    @Value("${file.upload-dir:/app/uploads}")
    private String uploadRoot;

    @Override
    public void addResourceHandlers(
            ResourceHandlerRegistry registry) {
        Path uploadPath = Paths
                .get(uploadRoot)
                .toAbsolutePath()
                .normalize();

        String location = uploadPath
                .toUri()
                .toString();

        registry.addResourceHandler(
                "/uploads/**")
                .addResourceLocations(
                        location);
    }
}