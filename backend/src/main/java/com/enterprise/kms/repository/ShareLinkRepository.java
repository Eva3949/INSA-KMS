package com.enterprise.kms.repository;

import com.enterprise.kms.entity.ShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareLinkRepository extends JpaRepository<ShareLink, UUID> {
    Optional<ShareLink> findByTokenHash(String tokenHash);
    List<ShareLink> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<ShareLink> findByExpiresAtAfterOrderByCreatedAtDesc(OffsetDateTime now);
    long countByExpiresAtAfter(OffsetDateTime now);
}
