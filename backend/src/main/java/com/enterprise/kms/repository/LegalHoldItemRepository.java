package com.enterprise.kms.repository;

import com.enterprise.kms.entity.LegalHoldItem;
import com.enterprise.kms.entity.LegalHoldItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LegalHoldItemRepository extends JpaRepository<LegalHoldItem, LegalHoldItemId> {
    List<LegalHoldItem> findByIdLegalHoldId(UUID legalHoldId);
    boolean existsByIdDocumentId(UUID documentId);
}
