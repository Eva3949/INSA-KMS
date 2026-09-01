package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferSessionAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeTransferSessionAttendeeRepository extends JpaRepository<KnowledgeTransferSessionAttendee, UUID> {
    List<KnowledgeTransferSessionAttendee> findBySessionId(UUID sessionId);
    Optional<KnowledgeTransferSessionAttendee> findBySessionIdAndUserId(UUID sessionId, UUID userId);
    void deleteBySessionId(UUID sessionId);
}
