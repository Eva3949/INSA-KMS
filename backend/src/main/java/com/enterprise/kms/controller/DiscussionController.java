package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.dto.DiscussionAttachmentDTO;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.DiscussionMediaService;
import com.enterprise.kms.service.DiscussionService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/v1/discussions")
public class DiscussionController {
    private final DiscussionService discussionService;
    private final DiscussionMediaService mediaService;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public DiscussionController(DiscussionService discussionService) {
        this(discussionService, null, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DiscussionController(DiscussionService discussionService,
                                DiscussionMediaService mediaService,
                                UserRepository userRepository,
                                DepartmentRepository departmentRepository) {
        this.discussionService = discussionService;
        this.mediaService = mediaService;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<Map<String, Object>>> getTopics(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            Pageable pageable) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(discussionService.searchTopics(search, status, username, isAdmin, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_CREATE", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> createTopic(@RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        DiscussionTopic topic = discussionService.createTopic(body, username);
        return ResponseEntity.ok(discussionService.toTopicResponse(topic));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_VIEW", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> getTopicDetail(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(discussionService.getTopicDetail(id, username, isAdmin));
    }

    @PostMapping("/{id}/replies")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_REPLY_ADD", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> addReply(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        DiscussionReply reply = discussionService.addReply(id, body, username, isAdmin);
        return ResponseEntity.ok(discussionService.toReplyResponse(reply));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_STATUS_CHANGE", resourceType = "DISCUSSION")
    public ResponseEntity<Map<String, Object>> setTopicStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        String status = body.getOrDefault("status", "OPEN");
        DiscussionTopic topic = discussionService.setTopicStatus(id, status, username, isAdmin);
        return ResponseEntity.ok(discussionService.toTopicResponse(topic));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_TOPIC_DELETE", resourceType = "DISCUSSION")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        discussionService.deleteTopic(id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/replies/{replyId}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DISCUSSION_REPLY_DELETE", resourceType = "DISCUSSION")
    public ResponseEntity<Void> deleteReply(@PathVariable UUID id, @PathVariable UUID replyId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        discussionService.deleteReply(replyId, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<DiscussionAttachmentDTO> uploadMedia(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "replyId", required = false) UUID replyId,
            @RequestParam(value = "mediaType", required = false) String mediaType,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        DiscussionAttachmentDTO dto = mediaService.uploadMedia(id, replyId, file, mediaType, durationSeconds, username, isAdmin);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}/media/{mediaId}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<DiscussionAttachmentDTO> getMediaMetadata(
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        DiscussionAttachmentDTO dto = mediaService.getMediaMetadata(id, mediaId, username, isAdmin);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}/media/{mediaId}/content")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Resource> streamMediaContent(
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return mediaService.streamMediaContent(id, mediaId, username, isAdmin);
    }

    @DeleteMapping("/{id}/media/{mediaId}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Void> deleteMedia(
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        mediaService.deleteMedia(id, mediaId, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/available-users")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAvailableUsers(
            @RequestParam(name = "q", required = false) String query) {
        if (userRepository == null) return ResponseEntity.ok(Collections.emptyList());
        List<User> users;
        if (query != null && !query.isBlank()) {
            String q = query.trim();
            users = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(q, q, q);
        } else {
            users = userRepository.findAll();
        }

        List<Map<String, Object>> result = users.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", u.getId());
                    map.put("username", u.getUsername());
                    map.put("fullName", (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername());
                    map.put("email", u.getEmail());
                    map.put("department", u.getDepartment() != null ? u.getDepartment().getName() : null);
                    map.put("departmentId", u.getDepartment() != null ? u.getDepartment().getId() : null);
                    map.put("jobTitle", u.getJobTitle());
                    return map;
                })
                .limit(30)
                .toList();

        return ResponseEntity.ok(result);
    }
}
