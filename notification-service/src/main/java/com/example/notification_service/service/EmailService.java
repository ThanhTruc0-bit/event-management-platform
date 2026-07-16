package com.example.notification_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromEmail;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    public void sendTestEmail(
            String receiverEmail) {
        validateEmail(receiverEmail);

        if (!mailEnabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email sending is disabled. Set MAIL_ENABLED=true.");
        }

        if (fromEmail == null ||
                fromEmail.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "MAIL_FROM or MAIL_USERNAME is not configured.");
        }

        String subject = "Kiểm tra hệ thống email đặt vé";

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                </head>

                <body style="
                    margin:0;
                    padding:0;
                    background:#f1f5f9;
                    font-family:Arial,sans-serif;
                    color:#0f172a;
                ">
                    <div style="
                        max-width:600px;
                        margin:40px auto;
                        padding:24px;
                    ">
                        <div style="
                            background:#ffffff;
                            border-radius:20px;
                            overflow:hidden;
                            box-shadow:0 10px 30px rgba(15,23,42,0.08);
                        ">
                            <div style="
                                background:#059669;
                                color:#ffffff;
                                padding:28px;
                            ">
                                <div style="
                                    font-size:13px;
                                    font-weight:bold;
                                    letter-spacing:1px;
                                ">
                                    NOTIFICATION SERVICE
                                </div>

                                <h1 style="
                                    margin:10px 0 0;
                                    font-size:28px;
                                ">
                                    Gửi email thành công
                                </h1>
                            </div>

                            <div style="padding:28px;">
                                <p style="
                                    margin:0;
                                    font-size:16px;
                                    line-height:1.7;
                                ">
                                    Đây là email kiểm tra từ hệ thống bán vé.
                                </p>

                                <div style="
                                    margin-top:22px;
                                    padding:18px;
                                    border:1px solid #dbeafe;
                                    background:#eff6ff;
                                    border-radius:14px;
                                ">
                                    SMTP Gmail và Notification Service
                                    đang hoạt động bình thường.
                                </div>

                                <p style="
                                    margin:24px 0 0;
                                    color:#64748b;
                                    font-size:14px;
                                    line-height:1.6;
                                ">
                                    Sau khi kiểm tra thành công, hệ thống sẽ
                                    gửi email tự động khi thanh toán và phát
                                    hành vé QR hoàn tất.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """;

        sendHtmlEmail(
                receiverEmail.trim(),
                subject,
                html);
    }

    public void sendHtmlEmail(
            String receiverEmail,
            String subject,
            String htmlContent) {
        validateEmail(receiverEmail);

        if (!mailEnabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email sending is disabled.");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    false,
                    "UTF-8");

            helper.setFrom(
                    fromEmail);

            helper.setTo(
                    receiverEmail.trim());

            helper.setSubject(
                    subject);

            helper.setText(
                    htmlContent,
                    true);

            mailSender.send(
                    message);
        } catch (MessagingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cannot create email message");
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Cannot send email: "
                            + exception.getMessage());
        }
    }

    private void validateEmail(
            String email) {
        if (email == null ||
                email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Receiver email is required");
        }

        String normalizedEmail = email.trim();

        if (!normalizedEmail.matches(
                "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Receiver email is invalid");
        }
    }
}