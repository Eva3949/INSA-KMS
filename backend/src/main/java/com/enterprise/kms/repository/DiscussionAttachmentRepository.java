package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DiscussionAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscussionAttachmentRepository extends JpaRepository<DiscussionAttachment, UUID> {

    List<DiscussionAttachment> findByDiscussionIdAndReplyIsNullOrderByCreatedAtAsc(UUID discussionId);

    List<DiscussionAttachment> findByReplyIdOrderByCreatedAtAsc(UUID replyId);

    List<DiscussionAttachment> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);

    Optional<DiscussionAttachment> findByIdAndDiscussionId(UUID id, UUID discussionId);
}
