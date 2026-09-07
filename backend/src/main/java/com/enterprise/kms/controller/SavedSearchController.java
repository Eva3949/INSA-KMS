package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.SavedSearchService;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search/saved")
public class SavedSearchController {
    private final SavedSearchService savedSearchService;
    private final UserRepository userRepository;

    public SavedSearchController(SavedSearchService savedSearchService, UserRepository userRepository) {
        this.savedSearchService = savedSearchService;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<?> listSavedSearches() {
        User user = resolveUser();
        if (user == null) return ResponseEntity.ok(java.util.List.of());
        return ResponseEntity.ok(savedSearchService.listSavedSearches(user.getId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SAVED_SEARCH_CREATE", resourceType = "SEARCH")
    public ResponseEntity<Map<String, Object>> createSavedSearch(@RequestBody Map<String, Object> body) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.badRequest().build();
        String name = (String) body.get("name");
        String queryJson = (String) body.get("queryJson");
        if (name == null || name.isBlank()) {
            name = "Saved Search";
        }
        Boolean alertEnabled = body.containsKey("alertEnabled") ? (Boolean) body.get("alertEnabled") : false;
        String alertFrequency = (String) body.getOrDefault("alertFrequency", "DAILY");
        return ResponseEntity.ok(savedSearchService.createSavedSearch(user.getId(), name, queryJson, alertEnabled, alertFrequency));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SAVED_SEARCH_DELETE", resourceType = "SEARCH")
    public ResponseEntity<Map<String, Object>> deleteSavedSearch(@PathVariable UUID id) {
        User user = resolveUser();
        if (user != null) savedSearchService.deleteSavedSearch(id, user.getId());
        return ResponseEntity.ok(Map.of("status", "DELETED"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SAVED_SEARCH_UPDATE", resourceType = "SEARCH")
    public ResponseEntity<Map<String, Object>> updateSavedSearch(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.badRequest().build();
        Boolean alertEnabled = body.containsKey("alertEnabled") ? (Boolean) body.get("alertEnabled") : null;
        String alertFrequency = (String) body.get("alertFrequency");
        savedSearchService.updateSavedSearch(id, user.getId(), alertEnabled, alertFrequency);
        return ResponseEntity.ok(Map.of("status", "UPDATED"));
    }

    private User resolveUser() {
        String username = SecurityUtils.getCurrentUsername();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub(SecurityUtils.getCurrentUserSub()))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(SecurityUtils.getCurrentUserEmail());
                    u.setKeycloakSub(SecurityUtils.getCurrentUserSub());
                    return userRepository.save(u);
                });
    }
}
