package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class SearchService {
    private final DocumentRepository documentRepository;

    public SearchService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    public Page<Document> searchDocuments(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return documentRepository.findByIsDeletedFalse(pageable);
        }
        return documentRepository.fullTextSearch(query, pageable);
    }
}
