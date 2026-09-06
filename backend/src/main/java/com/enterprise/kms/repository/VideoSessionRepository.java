package com.enterprise.kms.repository;

import com.enterprise.kms.entity.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoSessionRepository extends JpaRepository<VideoSession, UUID> {

    List<VideoSession> findByDiscussionIdOrderByScheduledStartDescCreatedAtDesc(UUID discussionId);

    List<VideoSession> findByDiscussionIdAndStatusInOrderByScheduledStartDesc(UUID discussionId, List<String> statuses);

    Optional<VideoSession> findByIdAndDiscussionId(UUID id, UUID discussionId);

    @Query("SELECT s FROM VideoSession s WHERE s.discussion.id = :discussionId AND s.status = 'ACTIVE'")
    List<VideoSession> findActiveSessionsByDiscussionId(@Param("discussionId") UUID discussionId);

    @Query("SELECT s FROM VideoSession s JOIN s.participants p WHERE p.username = :username ORDER BY s.scheduledStart DESC")
    List<VideoSession> findSessionsForParticipant(@Param("username") String username);
}
