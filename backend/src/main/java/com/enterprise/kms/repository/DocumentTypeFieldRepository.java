package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentTypeField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentTypeFieldRepository extends JpaRepository<DocumentTypeField, UUID> {
    List<DocumentTypeField> findByDocumentTypeIdOrderByCreatedAtAsc(UUID documentTypeId);
    boolean existsByDocumentTypeIdAndFieldKey(UUID documentTypeId, String fieldKey);
}
