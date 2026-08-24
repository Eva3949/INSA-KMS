package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-11 full-text search, constrained by FR-16: results only ever contain
 * documents the requesting user is authorised to see.
 */
@Service
public class SearchService {
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;

    public SearchService(DocumentRepository documentRepository, PermissionService permissionService) {
        this.documentRepository = documentRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public Page<Document> searchDocuments(String query, Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();

        if (query == null || query.isBlank()) {
            return documentRepository.findAuthorized(
                    caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                    caller.departmentIdText(), caller.privilegedRead(), pageable);
        }
        return documentRepository.fullTextSearchAuthorized(
                query, caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                caller.departmentIdText(), caller.privilegedRead(), pageable);
    }
}
