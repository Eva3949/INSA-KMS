package com.enterprise.kms.repository;

import com.enterprise.kms.entity.VideoSessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoSessionParticipantRepository extends JpaRepository<VideoSessionParticipant, UUID> {

    List<VideoSessionParticipant> findByVideoSessionIdOrderByCreatedAtAsc(UUID videoSessionId);

    Optional<VideoSessionParticipant> findByVideoSessionIdAndUsername(UUID videoSessionId, String username);

    Optional<VideoSessionParticipant> findByVideoSessionIdAndUsernameIgnoreCase(UUID videoSessionId, String username);

    Optional<VideoSessionParticipant> findByVideoSessionIdAndUserId(UUID videoSessionId, UUID userId);

    boolean existsByVideoSessionIdAndUsername(UUID videoSessionId, String username);

    boolean existsByVideoSessionIdAndUsernameIgnoreCase(UUID videoSessionId, String username);

    void deleteByVideoSessionIdAndUsername(UUID videoSessionId, String username);

    void deleteByVideoSessionIdAndUsernameIgnoreCase(UUID videoSessionId, String username);
}
