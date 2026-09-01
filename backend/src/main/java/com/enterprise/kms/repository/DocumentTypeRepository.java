package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentTypeRepository extends JpaRepository<DocumentType, UUID> {
    Optional<DocumentType> findByName(String name);
    Optional<DocumentType> findByNameIgnoreCase(String name);
    @org.springframework.data.jpa.repository.Query("SELECT dt FROM DocumentType dt WHERE dt.isActive = true OR dt.isActive IS NULL ORDER BY dt.name ASC")
    java.util.List<DocumentType> findByIsActiveTrue();

    java.util.List<DocumentType> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String name, String description);
}
