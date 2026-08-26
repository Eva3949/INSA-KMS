package com.enterprise.kms.service;

import com.enterprise.kms.entity.AuditLogEntity;
import com.enterprise.kms.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Section 7 integration: forwards the immutable audit trail to the corporate
 * SIEM endpoint. Enabled by configuring the siem.webhook-url system setting;
 * a moving watermark (siem.last-forwarded-at) keeps forwarding at-least-once.
 */
@Service
public class SiemForwardService {
    private static final Logger log = LoggerFactory.getLogger(SiemForwardService.class);
    private static final int BATCH_LIMIT = 500;

    private final AuditLogRepository auditLogRepository;
    private final SystemSettingService systemSettingService;
    private final RestClient restClient = RestClient.builder().build();

    public SiemForwardService(AuditLogRepository auditLogRepository, SystemSettingService systemSettingService) {
        this.auditLogRepository = auditLogRepository;
        this.systemSettingService = systemSettingService;
    }

    @Scheduled(cron = "${kms.siem.forward-cron:0 */15 * * * *}")
    public void runScheduled() {
        try {
            forwardPending();
        } catch (Exception e) {
            log.error("Scheduled SIEM forwarding failed", e);
        }
    }

    public Map<String, Object> forwardPending() {
        Map<String, Object> result = new LinkedHashMap<>();
        String webhookUrl = systemSettingService.getSettingValue("siem.webhook-url", "");
        if (webhookUrl == null || webhookUrl.isBlank()) {
            result.put("status", "DISABLED");
            result.put("hint", "Configure the siem.webhook-url setting to enable automated forwarding.");
            return result;
        }

        OffsetDateTime from = OffsetDateTime.now().minusHours(24);
        String watermark = systemSettingService.getSettingValue("siem.last-forwarded-at", null);
        if (watermark != null && !watermark.isBlank()) {
            try {
                from = OffsetDateTime.parse(watermark);
            } catch (Exception ignored) {
                // fall back to the default window
            }
        }

        List<AuditLogEntity> pending = auditLogRepository.findByCreatedAtAfterOrderByCreatedAtAsc(from);
        if (pending.size() > BATCH_LIMIT) {
            pending = pending.subList(0, BATCH_LIMIT);
        }
        if (pending.isEmpty()) {
            result.put("status", "UP_TO_DATE");
            result.put("forwarded", 0);
            return result;
        }

        List<Map<String, Object>> events = new ArrayList<>();
        for (AuditLogEntity entry : pending) {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("id", entry.getId());
            event.put("userId", entry.getUserId());
            event.put("userEmail", entry.getUserEmail());
            event.put("action", entry.getAction());
            event.put("resourceType", entry.getResourceType());
            event.put("resourceId", entry.getResourceId());
            event.put("ipAddress", entry.getIpAddress());
            event.put("timestamp", entry.getCreatedAt() != null ? entry.getCreatedAt().toString() : null);
            events.add(event);
        }

        restClient.post()
                .uri(webhookUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(events)
                .retrieve()
                .toBodilessEntity();

        OffsetDateTime newWatermark = pending.get(pending.size() - 1).getCreatedAt();
        if (newWatermark != null) {
            systemSettingService.updateSettings(Map.of("siem.last-forwarded-at", newWatermark.toString()));
        }

        result.put("status", "FORWARDED");
        result.put("forwarded", events.size());
        result.put("watermark", newWatermark != null ? newWatermark.toString() : null);
        log.info("Forwarded {} audit events to SIEM", events.size());
        return result;
    }
}
