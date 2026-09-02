package com.enterprise.kms.service;

import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class DiscussionService {

    private final DiscussionTopicRepository topicRepository;
    private final DiscussionReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public DiscussionService(DiscussionTopicRepository topicRepository,
                             DiscussionReplyRepository replyRepository,
                             UserRepository userRepository,
                             AuditService auditService) {
        this.topicRepository = topicRepository;
        this.replyRepository = replyRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<DiscussionTopic> getTopics(String status, String category, String search, Pageable pageable) {
        String statusFilter = (status != null && !status.isBlank()) ? status.toUpperCase() : null;
        String categoryFilter = (category != null && !category.isBlank()) ? category : null;
        String searchFilter = (search != null && !search.isBlank()) ? search.trim() : null;

        return topicRepository.searchTopics(statusFilter, categoryFilter, searchFilter, pageable);
    }

    public DiscussionTopic getTopicById(UUID id) {
        DiscussionTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discussion topic not found with ID: " + id));
        topic.setViewsCount(topic.getViewsCount() + 1);
        return topicRepository.save(topic);
    }

    @Transactional(readOnly = true)
    public List<DiscussionReply> getRepliesForTopic(UUID topicId) {
        return replyRepository.findByTopicIdOrderByCreatedAtAsc(topicId);
    }

    public DiscussionTopic createTopic(String title, String description, String category, String authorUsername) {
        DiscussionTopic topic = new DiscussionTopic();
        topic.setTitle(title);
        topic.setDescription(description);
        if (category != null && !category.isBlank()) {
            topic.setCategory(category);
        }
        topic.setStatus("OPEN");

        if (authorUsername != null && !authorUsername.isBlank()) {
            Optional<User> uOpt = userRepository.findByUsername(authorUsername);
            if (uOpt.isPresent()) {
                topic.setAuthorId(uOpt.get().getId());
                topic.setAuthorName(uOpt.get().getFullName() != null ? uOpt.get().getFullName() : uOpt.get().getUsername());
            } else {
                topic.setAuthorName(authorUsername);
            }
        }

        DiscussionTopic saved = topicRepository.save(topic);
        auditService.recordAuditLog(authorUsername, null, "DISCUSSION_TOPIC_CREATE", "DISCUSSION", saved.getId().toString(), null, "Created topic: " + title);
        return saved;
    }

    public DiscussionTopic updateTopicStatus(UUID id, String status, String currentUsername, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discussion topic not found with ID: " + id));

        if (!isAdmin && !isAuthor(topic, currentUsername)) {
            throw new SecurityException("You are not authorized to change the status of this topic");
        }

        String newStatus = (status != null && status.equalsIgnoreCase("CLOSED")) ? "CLOSED" : "OPEN";
        topic.setStatus(newStatus);
        DiscussionTopic saved = topicRepository.save(topic);
        auditService.recordAuditLog(currentUsername, null, "DISCUSSION_TOPIC_STATUS", "DISCUSSION", saved.getId().toString(), null, "Updated topic status to " + newStatus);
        return saved;
    }

    public void deleteTopic(UUID id, String currentUsername, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discussion topic not found with ID: " + id));

        if (!isAdmin && !isAuthor(topic, currentUsername)) {
            throw new SecurityException("You are not authorized to delete this topic");
        }

        topicRepository.delete(topic);
        auditService.recordAuditLog(currentUsername, null, "DISCUSSION_TOPIC_DELETE", "DISCUSSION", id.toString(), null, "Deleted topic: " + topic.getTitle());
    }

    public DiscussionReply createReply(UUID topicId, UUID parentReplyId, String content, String authorUsername, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException("Discussion topic not found with ID: " + topicId));

        if ("CLOSED".equalsIgnoreCase(topic.getStatus()) && !isAdmin) {
            throw new IllegalStateException("Cannot reply to a closed discussion topic");
        }

        DiscussionReply reply = new DiscussionReply();
        reply.setTopicId(topicId);
        reply.setParentReplyId(parentReplyId);
        reply.setContent(content);

        if (authorUsername != null && !authorUsername.isBlank()) {
            Optional<User> uOpt = userRepository.findByUsername(authorUsername);
            if (uOpt.isPresent()) {
                reply.setAuthorId(uOpt.get().getId());
                reply.setAuthorName(uOpt.get().getFullName() != null ? uOpt.get().getFullName() : uOpt.get().getUsername());
            } else {
                reply.setAuthorName(authorUsername);
            }
        }

        DiscussionReply savedReply = replyRepository.save(reply);
        topic.setRepliesCount(replyRepository.countByTopicId(topicId));
        topicRepository.save(topic);

        auditService.recordAuditLog(authorUsername, null, "DISCUSSION_REPLY_CREATE", "DISCUSSION", savedReply.getId().toString(), null, "Added reply to topic: " + topic.getTitle());
        return savedReply;
    }

    public void deleteReply(UUID replyId, String currentUsername, boolean isAdmin) {
        DiscussionReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new IllegalArgumentException("Discussion reply not found with ID: " + replyId));

        if (!isAdmin && !isReplyAuthor(reply, currentUsername)) {
            throw new SecurityException("You are not authorized to delete this reply");
        }

        UUID topicId = reply.getTopicId();
        replyRepository.delete(reply);

        Optional<DiscussionTopic> topicOpt = topicRepository.findById(topicId);
        if (topicOpt.isPresent()) {
            DiscussionTopic topic = topicOpt.get();
            topic.setRepliesCount(replyRepository.countByTopicId(topicId));
            topicRepository.save(topic);
        }

        auditService.recordAuditLog(currentUsername, null, "DISCUSSION_REPLY_DELETE", "DISCUSSION", replyId.toString(), null, "Deleted reply");
    }

    private boolean isAuthor(DiscussionTopic topic, String username) {
        if (username == null) return false;
        if (username.equalsIgnoreCase(topic.getAuthorName())) return true;
        Optional<User> uOpt = userRepository.findByUsername(username);
        return uOpt.isPresent() && uOpt.get().getId().equals(topic.getAuthorId());
    }

    private boolean isReplyAuthor(DiscussionReply reply, String username) {
        if (username == null) return false;
        if (username.equalsIgnoreCase(reply.getAuthorName())) return true;
        Optional<User> uOpt = userRepository.findByUsername(username);
        return uOpt.isPresent() && uOpt.get().getId().equals(reply.getAuthorId());
    }
}
