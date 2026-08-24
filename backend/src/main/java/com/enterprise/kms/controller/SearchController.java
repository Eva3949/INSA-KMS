package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.SearchQueryLog;
import com.enterprise.kms.repository.SearchQueryLogRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {
    private final SearchService searchService;
    private final SearchQueryLogRepository searchQueryLogRepository;

    public SearchController(SearchService searchService, SearchQueryLogRepository searchQueryLogRepository) {
        this.searchService = searchService;
        this.searchQueryLogRepository = searchQueryLogRepository;
    }

    @GetMapping("/quick")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_QUICK", resourceType = "SEARCH")
    public ResponseEntity<Page<Document>> quickSearch(@RequestParam("q") String query, Pageable pageable) {
        Page<Document> results = searchService.searchDocuments(query, pageable);
        logSearchQuery(query, results);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/advanced")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_ADVANCED", resourceType = "SEARCH")
    public ResponseEntity<Page<Document>> advancedSearch(@RequestParam(value = "query", required = false) String query, Pageable pageable) {
        Page<Document> results = searchService.searchDocuments(query, pageable);
        if (query != null && !query.isBlank()) {
            logSearchQuery(query, results);
        }
        return ResponseEntity.ok(results);
    }

    private void logSearchQuery(String query, Page<Document> results) {
        try {
            String trimmed = query.trim();
            if (trimmed.isEmpty() || trimmed.length() > 500) {
                return;
            }
            SearchQueryLog entry = new SearchQueryLog();
            entry.setQueryText(trimmed.toLowerCase());
            entry.setUserId(SecurityUtils.getCurrentUsername());
            entry.setResultCount((int) Math.min(results.getTotalElements(), Integer.MAX_VALUE));
            searchQueryLogRepository.save(entry);
        } catch (Exception ignored) {
            // Analytics logging must never break the search itself
        }
    }
}
