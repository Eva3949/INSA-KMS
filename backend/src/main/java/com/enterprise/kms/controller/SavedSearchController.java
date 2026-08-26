package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
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
        UUID userId = resolveUserId();
        if (userId == null) return ResponseEntity.ok(java.util.List.of());
        return ResponseEntity.ok(savedSearchService.listSavedSearches(userId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SAVED_SEARCH_CREATE", resourceType = "SEARCH")
    public ResponseEntity<Map<String, Object>> createSavedSearch(@RequestBody Map<String, String> body) {
        UUID userId = resolveUserId();
        if (userId == null) return ResponseEntity.badRequest().build();
        String name = body.get("name");
        String queryJson = body.get("queryJson");
        return ResponseEntity.ok(savedSearchService.createSavedSearch(userId, name, queryJson));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SAVED_SEARCH_DELETE", resourceType = "SEARCH")
    public ResponseEntity<Map<String, Object>> deleteSavedSearch(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        if (userId != null) savedSearchService.deleteSavedSearch(id, userId);
        return ResponseEntity.ok(Map.of("status", "DELETED"));
    }

    private UUID resolveUserId() {
        String username = SecurityUtils.getCurrentUsername();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .map(u -> u.getId())
                .orElse(null);
    }
}
