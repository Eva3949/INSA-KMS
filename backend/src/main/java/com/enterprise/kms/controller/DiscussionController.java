package com.enterprise.kms.controller;

import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.service.DiscussionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discussions")
public class DiscussionController {

    private final DiscussionService discussionService;

    public DiscussionController(DiscussionService discussionService) {
        this.discussionService = discussionService;
    }

    private String getUsername(Jwt jwt) {
        if (jwt == null) return "anonymous";
        String preferred = jwt.getClaimAsString("preferred_username");
        return preferred != null ? preferred : jwt.getSubject();
    }

    private boolean isAdmin(Jwt jwt) {
        if (jwt == null) return false;
        Object realmAccess = jwt.getClaim("realm_access");
        if (realmAccess instanceof Map<?, ?> map) {
            Object roles = map.get("roles");
            if (roles instanceof Iterable<?> list) {
                for (Object r : list) {
                    if ("ROLE_ADMIN".equalsIgnoreCase(String.valueOf(r)) || "ADMIN".equalsIgnoreCase(String.valueOf(r))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<DiscussionTopic>> listTopics(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        String[] sortParts = sort.split(",");
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = sortParts[0];

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(discussionService.getTopics(status, category, search, pageRequest));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DiscussionTopic> getTopicById(@PathVariable UUID id) {
        return ResponseEntity.ok(discussionService.getTopicById(id));
    }

    @GetMapping("/{id}/replies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DiscussionReply>> getTopicReplies(@PathVariable UUID id) {
        return ResponseEntity.ok(discussionService.getRepliesForTopic(id));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DiscussionTopic> createTopic(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        String category = (String) payload.get("category");

        if (title == null || title.isBlank() || description == null || description.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(discussionService.createTopic(title, description, category, getUsername(jwt)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DiscussionTopic> updateTopicStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String status = (String) payload.get("status");
        return ResponseEntity.ok(discussionService.updateTopicStatus(id, status, getUsername(jwt), isAdmin(jwt)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteTopic(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        discussionService.deleteTopic(id, getUsername(jwt), isAdmin(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/replies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DiscussionReply> createReply(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String content = (String) payload.get("content");
        String parentReplyIdStr = (String) payload.get("parentReplyId");
        UUID parentReplyId = (parentReplyIdStr != null && !parentReplyIdStr.isBlank()) ? UUID.fromString(parentReplyIdStr) : null;

        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(discussionService.createReply(id, parentReplyId, content, getUsername(jwt), isAdmin(jwt)));
    }

    @DeleteMapping("/replies/{replyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteReply(
            @PathVariable UUID replyId,
            @AuthenticationPrincipal Jwt jwt) {
        discussionService.deleteReply(replyId, getUsername(jwt), isAdmin(jwt));
        return ResponseEntity.noContent().build();
    }
}
