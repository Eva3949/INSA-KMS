package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.MicrosoftGraphService;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class WebDavController {

    private final MicrosoftGraphService graphService;
    private final PermissionService permissionService;
    private final DocumentService documentService;

    public WebDavController(MicrosoftGraphService graphService, PermissionService permissionService, DocumentService documentService) {
        this.graphService = graphService;
        this.permissionService = permissionService;
        this.documentService = documentService;
    }

    @GetMapping("/{id}/graph-details")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getGraphDetails(@PathVariable UUID id) {
        permissionService.requireDocumentAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(graphService.getGraphIntegrationDetails(id));
    }

    @PostMapping("/{id}/webdav-sync")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_WEBDAV_SYNC", resourceType = "DOCUMENT")
    public ResponseEntity<Map<String, Object>> webdavSaveBackSync(@PathVariable UUID id,
                                                        @RequestParam("file") MultipartFile file,
                                                        @RequestParam(value = "changeSummary", defaultValue = "Automatic Office desktop save-back sync.") String changeSummary) {
        permissionService.requireDocumentAccess(id, PermissionService.EDIT);
        String username = SecurityUtils.getCurrentUsername();
        Document updatedDoc = graphService.handleOfficeSaveBackSync(id, file, username, changeSummary);
        return ResponseEntity.ok(documentService.toResponse(updatedDoc));
    }
}
