package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentLockRepository extends JpaRepository<DocumentLock, UUID> {
    Optional<DocumentLock> findByDocumentId(UUID documentId);
}
