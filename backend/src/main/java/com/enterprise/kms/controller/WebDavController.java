package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.MicrosoftGraphService;
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

    public WebDavController(MicrosoftGraphService graphService) {
        this.graphService = graphService;
    }

    @GetMapping("/{id}/graph-details")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getGraphDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(graphService.getGraphIntegrationDetails(id));
    }

    @PostMapping("/{id}/webdav-sync")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_WEBDAV_SYNC", resourceType = "DOCUMENT")
    public ResponseEntity<Document> webdavSaveBackSync(@PathVariable UUID id,
                                                        @RequestParam("file") MultipartFile file,
                                                        @RequestParam(value = "changeSummary", defaultValue = "Automatic Office desktop save-back sync.") String changeSummary) {
        String username = SecurityUtils.getCurrentUsername();
        Document updatedDoc = graphService.handleOfficeSaveBackSync(id, file, username, changeSummary);
        return ResponseEntity.ok(updatedDoc);
    }
}
