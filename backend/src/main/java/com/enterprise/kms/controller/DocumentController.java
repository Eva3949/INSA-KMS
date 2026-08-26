package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.PermissionService;
import com.enterprise.kms.service.ShareLinkService;
import com.enterprise.kms.repository.DocumentCommentRepository;
import com.enterprise.kms.repository.DocumentFavoriteRepository;
import com.enterprise.kms.repository.DocumentLockRepository;
import com.enterprise.kms.repository.DocumentShareRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService documentService;
    private final PermissionService permissionService;
    private final com.enterprise.kms.service.SystemSettingService systemSettingService;
    private final ShareLinkService shareLinkService;
    private final DocumentCommentRepository documentCommentRepository;
    private final DocumentLockRepository documentLockRepository;
    private final UserRepository userRepository;
    private final DocumentFavoriteRepository documentFavoriteRepository;
    private final DocumentShareRepository documentShareRepository;

    public DocumentController(DocumentService documentService, PermissionService permissionService,
                              com.enterprise.kms.service.SystemSettingService systemSettingService,
                              ShareLinkService shareLinkService,
                              DocumentCommentRepository documentCommentRepository,
                              DocumentLockRepository documentLockRepository,
                              UserRepository userRepository,
                              DocumentFavoriteRepository documentFavoriteRepository,
                              DocumentShareRepository documentShareRepository) {
        this.documentService = documentService;
        this.permissionService = permissionService;
        this.systemSettingService = systemSettingService;
        this.shareLinkService = shareLinkService;
        this.documentCommentRepository = documentCommentRepository;
        this.documentLockRepository = documentLockRepository;
        this.userRepository = userRepository;
        this.documentFavoriteRepository = documentFavoriteRepository;
        this.documentShareRepository = documentShareRepository;
    }

    @GetMapping("/{id}/metadata")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getDocumentMetadata(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getDocumentMetadata(id));
    }

    @PutMapping("/{id}/metadata")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_METADATA_UPDATE", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> putDocumentMetadata(@PathVariable UUID id,
            @RequestBody java.util.Map<String, String> values) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        return ResponseEntity.ok(documentService.putDocumentMetadata(id, values));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getAllDocuments(Pageable pageable) {
        return ResponseEntity.ok(documentService.getAllActiveDocumentResponses(pageable));
    }

    /** My Documents — authored by the caller. */
    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getMyDocuments(Pageable pageable) {
        return ResponseEntity.ok(documentService.getMyDocuments(pageable));
    }

    /** Recently opened by the caller (FR-30 recency signal, from the audit trail). */
    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getRecentDocuments(
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(documentService.getRecentDocuments(limit));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_VIEW", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> getDocumentById(@PathVariable UUID id) {
        Document doc = permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_UPLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> uploadDocument(@RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "title", required = false) String title,
                                                  @RequestParam(value = "departmentCode", defaultValue = "ITSEC") String departmentCode,
                                                  @RequestParam(value = "documentTypeName", defaultValue = "Policy") String documentTypeName,
                                                  @RequestParam(value = "confidentialityLevel", defaultValue = "INTERNAL") String confidentialityLevel) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.createDocument(file, title, departmentCode, documentTypeName, confidentialityLevel, username);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DELETE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.DELETE);
        documentService.softDeleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_RESTORE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> restoreDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.DELETE);
        documentService.restoreDocument(id);
        return ResponseEntity.ok().build();
    }

    /**
     * FR-01 retrieval / FR-09 in-browser preview.
     * disposition=inline streams for the viewer, attachment forces a download.
     */
    /** FR-08: recycle bin - soft-deleted documents still inside the recovery window. */
    @GetMapping("/recycle-bin")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getRecycleBin(Pageable pageable) {
        int retentionDays = Integer.parseInt(systemSettingService.getSettingValue("recycle-bin.retention-days", "30"));
        java.util.List<java.util.Map<String, Object>> rows = new java.util.ArrayList<>();
        for (java.util.Map<String, Object> row : documentService.getRecycleBinResponses(pageable)) {
            long daysLeft = 0;
            Object deletedAtRaw = row.get("deletedAt");
            if (deletedAtRaw != null) {
                try {
                    java.time.OffsetDateTime deletedAt = java.time.OffsetDateTime.parse(deletedAtRaw.toString());
                    daysLeft = Math.max(0, retentionDays
                            - java.time.Duration.between(deletedAt, java.time.OffsetDateTime.now()).toDays());
                } catch (Exception ignored) { }
            }
            row.put("daysRemaining", daysLeft);
            row.put("retentionDays", retentionDays);
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }
    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DOWNLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<org.springframework.core.io.Resource> downloadDocument(
            @PathVariable UUID id,
            @RequestParam(name = "disposition", defaultValue = "attachment") String disposition) {

        java.util.Map<String, Object> payload = documentService.prepareDownload(id);
        java.nio.file.Path path = (java.nio.file.Path) payload.get("path");
        String fileName = String.valueOf(payload.get("fileName"));
        String mimeType = String.valueOf(payload.get("mimeType"));

        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        String dispositionType = "inline".equalsIgnoreCase(disposition) ? "inline" : "attachment";
        String encodedName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header("Content-Disposition", dispositionType + "; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                .header("Content-Type", mimeType)
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentVersions(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getVersionHistory(id));
    }

    @PostMapping("/{id}/versions/{versionId}/rollback")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_VERSION_ROLLBACK", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> rollbackToVersion(
            @PathVariable UUID id, @PathVariable UUID versionId) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.rollbackToVersion(id, versionId, username);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentComments(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        java.util.List<java.util.Map<String, Object>> comments = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentComment c : documentCommentRepository.findByDocumentIdOrderByCreatedAtAsc(id)) {
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", c.getId());
            row.put("content", c.getContent());
            row.put("author", c.getUser() != null ? c.getUser().getUsername() : null);
            row.put("parentCommentId", c.getParentComment() != null ? c.getParentComment().getId() : null);
            row.put("createdAt", c.getCreatedAt());
            comments.add(row);
        }
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_COMMENT_ADD", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> addDocumentComment(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> payload) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        Document doc = documentService.getDocumentById(id);
        String username = SecurityUtils.getCurrentUsername();

        com.enterprise.kms.entity.User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        com.enterprise.kms.entity.DocumentComment comment = new com.enterprise.kms.entity.DocumentComment();
        comment.setDocument(doc);
        comment.setContent(payload.getOrDefault("content", ""));
        comment.setUser(author);

        String parentId = payload.get("parentCommentId");
        if (parentId != null && !parentId.isBlank()) {
            UUID parentUuid = UUID.fromString(parentId);
            com.enterprise.kms.entity.DocumentComment parent = documentCommentRepository.findById(parentUuid)
                    .orElse(null);
            comment.setParentComment(parent);
        }
        comment = documentCommentRepository.save(comment);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", comment.getId());
        result.put("content", comment.getContent());
        result.put("author", username);
        result.put("parentCommentId", comment.getParentComment() != null ? comment.getParentComment().getId() : null);
        result.put("createdAt", comment.getCreatedAt());
        return ResponseEntity.ok(result);
    }

    /** FR-05: checkout lock status for a document. */
    @GetMapping("/{id}/lock-status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getLockStatus(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(documentService.getLockStatus(id));
    }

    /** FR-05: checkout — lock a document for exclusive editing. */
    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_CHECKOUT", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> checkoutDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(documentService.checkoutDocument(id, username));
    }

    /** FR-05: checkin — unlock a document and create a new version. */
    @PostMapping("/{id}/checkin")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_CHECKIN", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> checkinDocument(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "changeSummary", required = false) String changeSummary) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.checkinDocument(id, file, changeSummary, username);
        return ResponseEntity.ok(documentService.toResponse(doc));
    }

    /** FR-05: unlock — release a checkout lock without uploading a new version. */
    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_UNLOCK", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> unlockDocument(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(documentService.unlockDocument(id, username));
    }

    /** FR-09: dedicated preview endpoint — streams inline with format-appropriate headers. */
    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_PREVIEW", resourceType = "DOCUMENT")
    public ResponseEntity<org.springframework.core.io.Resource> previewDocument(@PathVariable UUID id) {
        java.util.Map<String, Object> payload = documentService.prepareDownload(id);
        java.nio.file.Path path = (java.nio.file.Path) payload.get("path");
        String fileName = String.valueOf(payload.get("fileName"));
        String mimeType = String.valueOf(payload.get("mimeType"));

        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(path);
        String encodedName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                .header("Content-Type", mimeType)
                .header("X-Frame-Options", "SAMEORIGIN")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    /** FR-20: create a secure share link with configurable expiry and optional password. */
    @PostMapping("/{id}/share-link")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_SHARE_LINK_CREATE", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> createShareLink(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, Object> body) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        String username = SecurityUtils.getCurrentUsername();
        int expiryHours = body.containsKey("expiryHours")
                ? Integer.parseInt(body.get("expiryHours").toString()) : 72;
        String password = body.get("password") != null ? body.get("password").toString() : null;
        return ResponseEntity.ok(shareLinkService.createShareLink(id, username, expiryHours, password));
    }

    // ===== Favorites (user bookmarking) =====

    @GetMapping("/{id}/favorite/status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getFavoriteStatus(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        boolean isFavorited = documentFavoriteRepository.existsByUserIdAndDocumentId(user.getId(), id);
        return ResponseEntity.ok(java.util.Map.of("favorited", isFavorited));
    }

    @PostMapping("/{id}/favorite/toggle")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> toggleFavorite(@PathVariable UUID id) {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        Document doc = documentService.getDocumentById(id);
        var existing = documentFavoriteRepository.findByUserIdAndDocumentId(user.getId(), id);
        if (existing.isPresent()) {
            documentFavoriteRepository.delete(existing.get());
            return ResponseEntity.ok(java.util.Map.of("favorited", false));
        } else {
            com.enterprise.kms.entity.DocumentFavorite fav = new com.enterprise.kms.entity.DocumentFavorite();
            fav.setUser(user);
            fav.setDocument(doc);
            documentFavoriteRepository.save(fav);
            return ResponseEntity.ok(java.util.Map.of("favorited", true));
        }
    }

    @GetMapping("/favorites")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getMyFavorites() {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentFavorite fav : documentFavoriteRepository.findByUserIdOrderByCreatedAtDesc(user.getId())) {
            result.add(documentService.toResponse(fav.getDocument()));
        }
        return ResponseEntity.ok(result);
    }

    // ===== Shared With Me =====

    @GetMapping("/shared-with-me")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getSharedWithMe() {
        String username = SecurityUtils.getCurrentUsername();
        com.enterprise.kms.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
        java.util.List<com.enterprise.kms.entity.DocumentShare> shares =
                documentShareRepository.findByGrantedToUserId(user.getId());
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (com.enterprise.kms.entity.DocumentShare share : shares) {
            java.util.Map<String, Object> row = documentService.toResponse(share.getDocument());
            row.put("shareId", share.getId());
            row.put("permissionLevel", share.getPermissionLevel());
            row.put("sharedAt", share.getCreatedAt());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }
}
