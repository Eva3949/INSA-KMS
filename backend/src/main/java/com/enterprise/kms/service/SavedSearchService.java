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

    @Transactional
    public Map<String, Object> createSavedSearch(UUID userId, String name, String queryJson) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found");

        SavedSearch ss = new SavedSearch();
        ss.setUser(user);
        ss.setName(name);
        ss.setQueryJson(queryJson);
        ss = savedSearchRepository.save(ss);
        return toMap(ss);
    }

    @Transactional
    public void deleteSavedSearch(UUID savedSearchId, UUID userId) {
        SavedSearch ss = savedSearchRepository.findById(savedSearchId).orElse(null);
        if (ss != null && ss.getUser().getId().equals(userId)) {
            savedSearchRepository.delete(ss);
        }
    }

    private Map<String, Object> toMap(SavedSearch ss) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", ss.getId());
        row.put("name", ss.getName());
        row.put("queryJson", ss.getQueryJson());
        row.put("createdAt", ss.getCreatedAt());
        return row;
    }
}
