package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface DocumentFavoriteRepository extends JpaRepository<DocumentFavorite, UUID> {
    Optional<DocumentFavorite> findByUserIdAndDocumentId(UUID userId, UUID documentId);
    java.util.List<DocumentFavorite> findByUserIdOrderByCreatedAtDesc(UUID userId);
    boolean existsByUserIdAndDocumentId(UUID userId, UUID documentId);
    void deleteByUserIdAndDocumentId(UUID userId, UUID documentId);
}
