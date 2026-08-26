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

import java.util.Map;

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
    public ResponseEntity<Page<Document>> advancedSearch(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "docTypeId", required = false) String docTypeId,
            @RequestParam(value = "deptId", required = false) String deptId,
            @RequestParam(value = "confidentiality", required = false) String confidentiality,
            @RequestParam(value = "authorId", required = false) String authorId,
            @RequestParam(value = "dateFrom", required = false) String dateFrom,
            @RequestParam(value = "dateTo", required = false) String dateTo,
            Pageable pageable) {

        boolean hasFilters = docTypeId != null || deptId != null || confidentiality != null
                || authorId != null || dateFrom != null || dateTo != null;

        Page<Document> results;
        if (hasFilters) {
            results = searchService.searchDocuments(query, docTypeId, deptId,
                    confidentiality, authorId, dateFrom, dateTo, pageable);
        } else {
            results = searchService.searchDocuments(query, pageable);
        }

        if (query != null && !query.isBlank()) {
            logSearchQuery(query, results);
        }
        return ResponseEntity.ok(results);
    }

    /** FR-12 facet counts for the current permission context. */
    @GetMapping("/facets")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSearchFacets() {
        return ResponseEntity.ok(searchService.getSearchFacets());
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
