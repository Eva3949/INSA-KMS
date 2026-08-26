package com.enterprise.kms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Section 7 integration: transactional email (notifications, share alerts,
 * admin test messages). Disabled until SMTP is configured via KMS_SMTP_*
 * environment variables — every send degrades to a log entry instead of
 * failing the caller.
 */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromAddress;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        @Value("${spring.mail.username:${KMS_SMTP_USERNAME:}}") String fromAddress) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromAddress = fromAddress != null && !fromAddress.isBlank() ? fromAddress : "kms@enterprise.internal";
    }

    public boolean isEnabled() {
        return mailSenderProvider.getIfAvailable() != null;
    }

    /** Best-effort send; never throws. Returns a status map for admin diagnostics. */
    public Map<String, Object> send(String to, String subject, String body) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("to", to);
        result.put("subject", subject);

        if (to == null || to.isBlank() || !to.contains("@")) {
            result.put("status", "SKIPPED");
            result.put("detail", "Invalid recipient address");
            return result;
        }
        if (!isEnabled()) {
            log.info("Email disabled (SMTP not configured). Would send to {} subject '{}'", to, subject);
            result.put("status", "DISABLED");
            result.put("detail", "SMTP host is not configured (KMS_SMTP_HOST).");
            return result;
        }

        try {
            JavaMailSender sender = mailSenderProvider.getObject();
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            result.put("status", "SENT");
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            result.put("status", "FAILED");
            result.put("detail", e.getMessage());
        }
        return result;
    }

    /** Fire-and-forget variant for internal callers (retention notices etc.). */
    public void notify(String to, String subject, String body) {
        try {
            send(to, subject, body);
        } catch (Exception e) {
            log.warn("notify() email failed: {}", e.getMessage());
        }
    }
}
