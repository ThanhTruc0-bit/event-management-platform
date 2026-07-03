package com.example.payment_service.util;

import jakarta.servlet.http.HttpServletRequest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;

public class VnpayUtil {

    private VnpayUtil() {
    }

    public static String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");

            SecretKeySpec secretKey = new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA512"
            );

            hmac512.init(secretKey);

            byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hash = new StringBuilder();

            for (byte b : bytes) {
                hash.append(String.format("%02x", b));
            }

            return hash.toString();
        } catch (Exception e) {
            throw new RuntimeException("Cannot generate HMAC SHA512", e);
        }
    }

    public static String buildHashData(Map<String, String> params) {
        TreeMap<String, String> sortedParams = new TreeMap<>(params);
        StringJoiner joiner = new StringJoiner("&");

        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            if (value == null || value.isBlank()) {
                continue;
            }

            joiner.add(urlEncode(key) + "=" + urlEncode(value));
        }

        return joiner.toString();
    }

    public static String buildQueryString(Map<String, String> params) {
        return buildHashData(params);
    }

    public static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public static String getIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-FORWARDED-FOR");

        if (ipAddress != null && !ipAddress.isBlank()) {
            return ipAddress.split(",")[0].trim();
        }

        ipAddress = request.getRemoteAddr();

        if ("0:0:0:0:0:0:0:1".equals(ipAddress)) {
            return "127.0.0.1";
        }

        return ipAddress;
    }
}