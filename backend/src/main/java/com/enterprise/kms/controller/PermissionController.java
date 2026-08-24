package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-17 Role-Based Access Control administration.
 * Permissions (VIEW / EDIT / DELETE / ADMIN) are assignable at folder and document
 * level to USER, GROUP or ROLE subjects. Section 8 grants this to Administrators
 * globally and to Content Owners within areas they administer.
 */
@RestController
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/api/v1/permissions/subjects")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "PERMISSION_SUBJECTS_VIEW", resourceType = "PERMISSION")
    public ResponseEntity<Map<String, Object>> getAssignableSubjects() {
        return ResponseEntity.ok(permissionService.availableSubjects());
    }

    // ---------------- Folder ACL ----------------

    @GetMapping("/api/v1/folders/{id}/permissions")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY')")
    @AuditLog(action = "FOLDER_PERMISSIONS_VIEW", resourceType = "PERMISSION")
    public ResponseEntity<List<Map<String, Object>>> listFolderPermissions(@PathVariable("id") UUID folderId) {
        return ResponseEntity.ok(permissionService.listFolderPermissions(folderId));
    }

    @PostMapping("/api/v1/folders/{id}/permissions")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "FOLDER_PERMISSION_GRANTED", resourceType = "PERMISSION")
    public ResponseEntity<Map<String, Object>> grantFolderPermission(@PathVariable("id") UUID folderId,
                                                                     @RequestBody Map<String, String> body) {
        Map<String, Object> saved = permissionService.grantFolderPermission(
                folderId, body.get("subjectType"), body.get("subjectId"), body.get("permissionLevel"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/api/v1/folders/{id}/permissions/{permissionId}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "FOLDER_PERMISSION_REVOKED", resourceType = "PERMISSION")
    public ResponseEntity<Map<String, String>> revokeFolderPermission(@PathVariable("id") UUID folderId,
                                                                      @PathVariable("permissionId") UUID permissionId) {
        permissionService.revokeFolderPermission(folderId, permissionId);
        return ResponseEntity.ok(Map.of("message", "Folder permission revoked", "id", permissionId.toString()));
    }

    // ---------------- Document ACL ----------------

    @GetMapping("/api/v1/documents/{id}/permissions")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY')")
    @AuditLog(action = "DOCUMENT_PERMISSIONS_VIEW", resourceType = "PERMISSION")
    public ResponseEntity<List<Map<String, Object>>> listDocumentPermissions(@PathVariable("id") UUID documentId) {
        return ResponseEntity.ok(permissionService.listDocumentPermissions(documentId));
    }

    @PostMapping("/api/v1/documents/{id}/permissions")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "DOCUMENT_PERMISSION_GRANTED", resourceType = "PERMISSION")
    public ResponseEntity<Map<String, Object>> grantDocumentPermission(@PathVariable("id") UUID documentId,
                                                                       @RequestBody Map<String, String> body) {
        Map<String, Object> saved = permissionService.grantDocumentPermission(
                documentId, body.get("subjectType"), body.get("subjectId"), body.get("permissionLevel"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/api/v1/documents/{id}/permissions/{permissionId}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "DOCUMENT_PERMISSION_REVOKED", resourceType = "PERMISSION")
    public ResponseEntity<Map<String, String>> revokeDocumentPermission(@PathVariable("id") UUID documentId,
                                                                        @PathVariable("permissionId") UUID permissionId) {
        permissionService.revokeDocumentPermission(documentId, permissionId);
        return ResponseEntity.ok(Map.of("message", "Document permission revoked", "id", permissionId.toString()));
    }
}
