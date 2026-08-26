package com.enterprise.kms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Section 7 integration: Chat/Collaboration Platform (Slack/MS Teams).
 * Sends share links and notifications to team channels via incoming webhooks.
 * Enabled by configuring the chat.webhook-url system setting.
 */
@Service
public class ChatIntegrationService {
    private static final Logger log = LoggerFactory.getLogger(ChatIntegrationService.class);

    private final SystemSettingService systemSettingService;
    private final RestClient restClient = RestClient.builder().build();

    public ChatIntegrationService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    public boolean isEnabled() {
        String url = systemSettingService.getSettingValue("chat.webhook-url", "");
        return url != null && !url.isBlank();
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        String webhookUrl = systemSettingService.getSettingValue("chat.webhook-url", "");
        status.put("enabled", isEnabled());
        status.put("configured", webhookUrl != null && !webhookUrl.isBlank());
        status.put("webhookUrl", webhookUrl != null && !webhookUrl.isBlank() ? maskUrl(webhookUrl) : "");
        status.put("platform", systemSettingService.getSettingValue("chat.platform", "auto-detect"));
        status.put("lastSentAt", systemSettingService.getSettingValue("chat.last-sent-at", ""));
        return status;
    }

    public Map<String, Object> sendShareNotification(String documentTitle, String shareUrl, String recipientName) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (!isEnabled()) {
            result.put("status", "DISABLED");
            result.put("hint", "Configure chat.webhook-url in System Settings to enable.");
            return result;
        }

        String webhookUrl = systemSettingService.getSettingValue("chat.webhook-url", "");
        String platform = systemSettingService.getSettingValue("chat.platform", "auto-detect");

        String payload;
        if ("slack".equalsIgnoreCase(platform) || ("auto-detect".equalsIgnoreCase(platform) && webhookUrl.contains("hooks.slack.com"))) {
            payload = buildSlackPayload(documentTitle, shareUrl, recipientName);
        } else {
            payload = buildTeamsPayload(documentTitle, shareUrl, recipientName);
        }

        return sendToWebhook(webhookUrl, payload);
    }

    public Map<String, Object> sendTestMessage(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (!isEnabled()) {
            result.put("status", "DISABLED");
            result.put("hint", "Configure chat.webhook-url in System Settings to enable.");
            return result;
        }

        String webhookUrl = systemSettingService.getSettingValue("chat.webhook-url", "");
        String platform = systemSettingService.getSettingValue("chat.platform", "auto-detect");

        String payload;
        if ("slack".equalsIgnoreCase(platform) || ("auto-detect".equalsIgnoreCase(platform) && webhookUrl.contains("hooks.slack.com"))) {
            payload = "{\"text\":\"" + escapeJson(message) + "\"}";
        } else {
            payload = "{\"@type\":\"Message\",\"text\":\"" + escapeJson(message) + "\"}";
        }

        return sendToWebhook(webhookUrl, payload);
    }

    private Map<String, Object> sendToWebhook(String webhookUrl, String payload) {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            restClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            result.put("status", "SENT");
            systemSettingService.updateSettings(Map.of("chat.last-sent-at", OffsetDateTime.now().toString()));
        } catch (Exception e) {
            result.put("status", "FAILED");
            result.put("error", e.getMessage());
            log.warn("Chat webhook send failed: {}", e.getMessage());
        }
        return result;
    }

    private String buildSlackPayload(String documentTitle, String shareUrl, String recipientName) {
        return "{\"text\":\"Document shared" + (recipientName != null ? " with " + escapeJson(recipientName) : "") +
                "\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\"," +
                "\"text\":\"\\U0001F4C1 *Document Shared*\\n*Title:* " + escapeJson(documentTitle) +
                "\\n< " + shareUrl + "|Open in KMS>\"}}]}";
    }

    private String buildTeamsPayload(String documentTitle, String shareUrl, String recipientName) {
        return "{\"@type\":\"Message\",\"themeColor\":\"0076D7\",\"summary\":\"Document shared\"," +
                "\"sections\":[{\"activityTitle\":\"Document Shared\"," +
                "\"facts\":[{\"name\":\"Title\",\"value\":\"" + escapeJson(documentTitle) + "\"}" +
                (recipientName != null ? ",{\"name\":\"Shared with\",\"value\":\"" + escapeJson(recipientName) + "\"}" : "") +
                "],\"markdown\":true}],\"potentialAction\":[{\"@type\":\"OpenUri\"," +
                "\"name\":\"Open in KMS\",\"targets\":[{\"os\":\"default\",\"uri\":\"" + shareUrl + "\"}]}]}";
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "");
    }

    private String maskUrl(String url) {
        if (url.length() <= 30) return "***";
        return url.substring(0, 20) + "..." + url.substring(url.length() - 10);
    }
}