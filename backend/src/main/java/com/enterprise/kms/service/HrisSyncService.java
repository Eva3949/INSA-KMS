package com.enterprise.kms.service;

import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class HrisSyncService {
    private static final Logger log = LoggerFactory.getLogger(HrisSyncService.class);

    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;
    private final AuditService auditService;
    private final SystemSettingService systemSettingService;

    public HrisSyncService(UserRepository userRepository,
                           KeycloakAdminService keycloakAdminService,
                           AuditService auditService,
                           SystemSettingService systemSettingService) {
        this.userRepository = userRepository;
        this.keycloakAdminService = keycloakAdminService;
        this.auditService = auditService;
        this.systemSettingService = systemSettingService;
    }

    @Scheduled(cron = "${kms.hris.sync-cron:0 0 6 * * MON-FRI}")
    public void scheduledSync() {
        String enabled = systemSettingService.getSettingValue("hris.sync-enabled", "false");
        if (!"true".equalsIgnoreCase(enabled)) {
            log.debug("HRIS sync skipped (hris.sync-enabled is not true)");
            return;
        }
        try {
            Map<String, Object> result = syncFromFeed();
            log.info("HRIS sync completed: {}", result);
        } catch (Exception e) {
            log.error("HRIS sync failed", e);
            systemSettingService.updateSettings(Map.of(
                    "hris.last-sync-status", "FAILED",
                    "hris.last-sync-error", e.getMessage() != null ? e.getMessage() : "Unknown error",
                    "hris.last-sync-at", OffsetDateTime.now().toString()));
        }
    }

    @Transactional
    public Map<String, Object> syncFromFeed() {
        return syncFromExternalList(List.of());
    }

    @Transactional
    public Map<String, Object> syncFromExternalList(List<Map<String, String>> hrisUsers) {
        Map<String, Object> result = new LinkedHashMap<>();
        int created = 0, updated = 0, deactivated = 0, unchanged = 0;

        if (hrisUsers == null || hrisUsers.isEmpty()) {
            result.put("status", "NO_DATA");
            result.put("detail", "No HRIS user data provided. Configure the HRIS webhook endpoint or POST employee data.");
            result.put("created", 0);
            result.put("updated", 0);
            result.put("deactivated", 0);
            return result;
        }

        List<String> activeUsernames = new ArrayList<>();

        for (Map<String, String> hrisUser : hrisUsers) {
            String username = hrisUser.get("username");
            String email = hrisUser.get("email");
            String status = hrisUser.getOrDefault("status", "ACTIVE");

            if (username == null || username.isBlank()) continue;
            activeUsernames.add(username);

            User existing = userRepository.findByUsername(username).orElse(null);

            if ("TERMINATED".equalsIgnoreCase(status) || "INACTIVE".equalsIgnoreCase(status)) {
                if (existing != null && Boolean.TRUE.equals(existing.getIsActive())) {
                    existing.setIsActive(false);
                    userRepository.save(existing);
                    keycloakAdminService.setEnabled(
                            keycloakAdminService.resolveUserId(existing.getKeycloakSub(), existing.getUsername()), false);
                    auditService.recordAuditLog("system", null,
                            "HRIS_USER_DEACTIVATED", "USER", existing.getId().toString(), null,
                            "{\"source\":\"HRIS\",\"username\":\"" + username + "\"}");
                    deactivated++;
                } else {
                    unchanged++;
                }
                continue;
            }

            if (existing == null) {
                String keycloakSub = keycloakAdminService.createUser(
                        username, email,
                        hrisUser.get("firstName"), hrisUser.get("lastName"),
                        null, hrisUser.getOrDefault("roleName", "ROLE_VIEWER"), true);
                if (keycloakSub == null) {
                    keycloakSub = "hris-" + username;
                }
                User user = new User();
                user.setUsername(username);
                user.setEmail(email != null ? email : username + "@hris.local");
                user.setRoleName(hrisUser.getOrDefault("roleName", "ROLE_VIEWER"));
                user.setKeycloakSub(keycloakSub);
                user.setIsActive(true);
                userRepository.save(user);
                created++;
            } else {
                boolean changed = false;
                if (email != null && !email.equals(existing.getEmail())) {
                    existing.setEmail(email);
                    changed = true;
                }
                if (!Boolean.TRUE.equals(existing.getIsActive())) {
                    existing.setIsActive(true);
                    keycloakAdminService.setEnabled(
                            keycloakAdminService.resolveUserId(existing.getKeycloakSub(), existing.getUsername()), true);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(existing);
                    auditService.recordAuditLog("system", null,
                            "HRIS_USER_REACTIVATED", "USER", existing.getId().toString(), null,
                            "{\"source\":\"HRIS\",\"username\":\"" + username + "\"}");
                    updated++;
                } else {
                    unchanged++;
                }
            }
        }

        for (User activeUser : userRepository.findAll()) {
            if (Boolean.TRUE.equals(activeUser.getIsActive())
                    && !activeUsernames.contains(activeUser.getUsername())
                    && activeUser.getKeycloakSub() != null
                    && !activeUser.getKeycloakSub().startsWith("hris-")) {
                continue;
            }
        }

        result.put("status", "COMPLETED");
        result.put("created", created);
        result.put("updated", updated);
        result.put("deactivated", deactivated);
        result.put("unchanged", unchanged);
        result.put("totalProcessed", hrisUsers.size());
        result.put("syncedAt", OffsetDateTime.now().toString());

        systemSettingService.updateSettings(Map.of(
                "hris.last-sync-status", "SUCCESS",
                "hris.last-sync-at", OffsetDateTime.now().toString(),
                "hris.last-sync-created", String.valueOf(created),
                "hris.last-sync-deactivated", String.valueOf(deactivated)));

        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSyncStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", "true".equalsIgnoreCase(systemSettingService.getSettingValue("hris.sync-enabled", "false")));
        status.put("cron", systemSettingService.getSettingValue("hris.sync-cron", "0 0 6 * * MON-FRI"));
        status.put("lastSyncAt", systemSettingService.getSettingValue("hris.last-sync-at", ""));
        status.put("lastSyncStatus", systemSettingService.getSettingValue("hris.last-sync-status", ""));
        status.put("lastSyncError", systemSettingService.getSettingValue("hris.last-sync-error", ""));
        status.put("totalUsers", userRepository.count());
        status.put("activeUsers", userRepository.countByIsActiveTrue());
        return status;
    }
}