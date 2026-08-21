package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
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

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/quick")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_QUICK", resourceType = "SEARCH")
    public ResponseEntity<Page<Document>> quickSearch(@RequestParam("q") String query, Pageable pageable) {
        return ResponseEntity.ok(searchService.searchDocuments(query, pageable));
    }

    @PostMapping("/advanced")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "SEARCH_ADVANCED", resourceType = "SEARCH")
    public ResponseEntity<Page<Document>> advancedSearch(@RequestParam(value = "query", required = false) String query, Pageable pageable) {
        return ResponseEntity.ok(searchService.searchDocuments(query, pageable));
    }
}
