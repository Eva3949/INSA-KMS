package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, UUID> {
    List<DocumentShare> findByGrantedToUserId(UUID userId);
}
