package com.enterprise.kms.service;

import com.enterprise.kms.entity.SavedSearch;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.SavedSearchRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-15 saved searches: lets users persist a search query + filters under a name
 * and re-execute it at any time.  Alert triggers (periodic re-run with email
 * notification) are handled by the caller via NotificationService.
 */
@Service
public class SavedSearchService {
    private final SavedSearchRepository savedSearchRepository;
    private final UserRepository userRepository;

    public SavedSearchService(SavedSearchRepository savedSearchRepository,
                              UserRepository userRepository) {
        this.savedSearchRepository = savedSearchRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSavedSearches(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return List.of();

        List<Map<String, Object>> rows = new ArrayList<>();
        for (SavedSearch ss : savedSearchRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            rows.add(toMap(ss));
        }
        return rows;
    }

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Transactional
    public Map<String, Object> createSavedSearch(UUID userId, String name, String queryJson,
                                                   Boolean alertEnabled, String alertFrequency) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found");

        String validJson = normalizeJson(queryJson);
        String cleanName = (name != null && !name.isBlank()) ? name.trim() : "Saved Search";

        SavedSearch ss = new SavedSearch();
        ss.setUser(user);
        ss.setName(cleanName);
        ss.setQueryJson(validJson);
        ss.setAlertEnabled(alertEnabled != null ? alertEnabled : false);
        ss.setAlertFrequency((alertFrequency != null && !alertFrequency.isBlank()) ? alertFrequency : "DAILY");
        ss = savedSearchRepository.save(ss);
        return toMap(ss);
    }

    private String normalizeJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return "{}";
        }
        String trimmed = raw.trim();
        try {
            objectMapper.readTree(trimmed);
            return trimmed;
        } catch (Exception e) {
            try {
                return objectMapper.writeValueAsString(Map.of("query", trimmed));
            } catch (Exception ex) {
                return "{\"query\":\"" + trimmed.replace("\"", "\\\"") + "\"}";
            }
        }
    }

    @Transactional
    public void deleteSavedSearch(UUID savedSearchId, UUID userId) {
        SavedSearch ss = savedSearchRepository.findById(savedSearchId).orElse(null);
        if (ss != null && ss.getUser().getId().equals(userId)) {
            savedSearchRepository.delete(ss);
        }
    }

    @Transactional
    public void updateSavedSearch(UUID savedSearchId, UUID userId, Boolean alertEnabled, String alertFrequency) {
        SavedSearch ss = savedSearchRepository.findById(savedSearchId).orElse(null);
        if (ss == null || !ss.getUser().getId().equals(userId)) return;
        if (alertEnabled != null) ss.setAlertEnabled(alertEnabled);
        if (alertFrequency != null && !alertFrequency.isBlank()) ss.setAlertFrequency(alertFrequency);
        savedSearchRepository.save(ss);
    }

    private Map<String, Object> toMap(SavedSearch ss) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", ss.getId());
        row.put("name", ss.getName());
        row.put("queryJson", ss.getQueryJson());
        row.put("createdAt", ss.getCreatedAt());
        row.put("alertEnabled", ss.getAlertEnabled());
        row.put("alertFrequency", ss.getAlertFrequency());
        row.put("lastAlertAt", ss.getLastAlertAt());
        return row;
    }
}
