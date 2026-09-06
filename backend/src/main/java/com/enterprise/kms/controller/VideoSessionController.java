package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.dto.CreateVideoSessionRequest;
import com.enterprise.kms.dto.InviteParticipantsRequest;
import com.enterprise.kms.dto.JoinVideoSessionResponse;
import com.enterprise.kms.dto.VideoSessionResponse;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.VideoSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class VideoSessionController {

    private final VideoSessionService videoSessionService;

    public VideoSessionController(VideoSessionService videoSessionService) {
        this.videoSessionService = videoSessionService;
    }

    @PostMapping("/api/v1/discussions/{discussionId}/video-sessions")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_CREATE", resourceType = "VIDEO_SESSION")
    public ResponseEntity<VideoSessionResponse> createSession(
            @PathVariable UUID discussionId,
            @RequestBody CreateVideoSessionRequest req) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.createSession(discussionId, req, username, isAdmin));
    }

    @GetMapping("/api/v1/discussions/{discussionId}/video-sessions")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<List<VideoSessionResponse>> listSessions(
            @PathVariable UUID discussionId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.listSessionsForDiscussion(discussionId, username, isAdmin));
    }

    @GetMapping("/api/v1/video-sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<VideoSessionResponse> getSessionDetail(
            @PathVariable UUID sessionId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.getSessionDetail(sessionId, username, isAdmin));
    }

    @PostMapping("/api/v1/video-sessions/{sessionId}/start")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_START", resourceType = "VIDEO_SESSION")
    public ResponseEntity<VideoSessionResponse> startSession(
            @PathVariable UUID sessionId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.startSession(sessionId, username, isAdmin));
    }

    @PostMapping("/api/v1/video-sessions/{sessionId}/join")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_JOIN", resourceType = "VIDEO_SESSION")
    public ResponseEntity<JoinVideoSessionResponse> joinSession(
            @PathVariable UUID sessionId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.joinSession(sessionId, username, isAdmin));
    }

    @PostMapping("/api/v1/video-sessions/{sessionId}/leave")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_LEAVE", resourceType = "VIDEO_SESSION")
    public ResponseEntity<Void> leaveSession(
            @PathVariable UUID sessionId) {
        String username = SecurityUtils.getCurrentUsername();
        videoSessionService.leaveSession(sessionId, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/video-sessions/{sessionId}/end")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_END", resourceType = "VIDEO_SESSION")
    public ResponseEntity<VideoSessionResponse> endSession(
            @PathVariable UUID sessionId) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.endSession(sessionId, username, isAdmin));
    }

    @PostMapping("/api/v1/video-sessions/{sessionId}/participants")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_INVITE_PARTICIPANTS", resourceType = "VIDEO_SESSION")
    public ResponseEntity<VideoSessionResponse> inviteParticipants(
            @PathVariable UUID sessionId,
            @RequestBody InviteParticipantsRequest req) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        return ResponseEntity.ok(videoSessionService.inviteParticipants(sessionId, req, username, isAdmin));
    }

    @DeleteMapping("/api/v1/video-sessions/{sessionId}/participants/{targetUsername}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "VIDEO_SESSION_REMOVE_PARTICIPANT", resourceType = "VIDEO_SESSION")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable UUID sessionId,
            @PathVariable String targetUsername) {
        String username = SecurityUtils.getCurrentUsername();
        boolean isAdmin = SecurityUtils.isSystemAdmin();
        videoSessionService.removeParticipant(sessionId, targetUsername, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/video-sessions/available-users")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAvailableUsers(
            @RequestParam(name = "q", required = false) String query) {
        return ResponseEntity.ok(videoSessionService.getAvailableUsers(query));
    }
}
