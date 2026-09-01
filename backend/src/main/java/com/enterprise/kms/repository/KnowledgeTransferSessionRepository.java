package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeTransferSessionRepository extends JpaRepository<KnowledgeTransferSession, UUID> {
    List<KnowledgeTransferSession> findByTransferCaseIdOrderByScheduledAtAsc(UUID caseId);
}
