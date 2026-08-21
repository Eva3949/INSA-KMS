package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.DocumentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Page<Document>> getAllDocuments(Pageable pageable) {
        return ResponseEntity.ok(documentService.getAllActiveDocuments(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_VIEW", resourceType = "DOCUMENT")
    public ResponseEntity<Document> getDocumentById(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocumentById(id));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_UPLOAD", resourceType = "DOCUMENT")
    public ResponseEntity<Document> uploadDocument(@RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "title", required = false) String title,
                                                  @RequestParam(value = "departmentCode", defaultValue = "ITSEC") String departmentCode,
                                                  @RequestParam(value = "documentTypeName", defaultValue = "Policy") String documentTypeName,
                                                  @RequestParam(value = "confidentialityLevel", defaultValue = "INTERNAL") String confidentialityLevel) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.createDocument(file, title, departmentCode, documentTypeName, confidentialityLevel, username);
        return ResponseEntity.ok(doc);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DELETE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        documentService.softDeleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_RESTORE", resourceType = "DOCUMENT")
    public ResponseEntity<Void> restoreDocument(@PathVariable UUID id) {
        documentService.restoreDocument(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentVersions(@PathVariable UUID id) {
        return ResponseEntity.ok(java.util.List.of());
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getDocumentComments(@PathVariable UUID id) {
        return ResponseEntity.ok(java.util.List.of());
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_BULK_OPERATION", resourceType = "DOCUMENT")
    public ResponseEntity<com.enterprise.kms.dto.BulkOperationResult> performBulkOperation(@RequestBody com.enterprise.kms.dto.BulkOperationRequest request) {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(documentService.performBulkOperation(request, username));
    }

    @GetMapping("/{id}/desktop-open")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DESKTOP_OPEN", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> openInDesktopApp(@PathVariable UUID id) {
        Document doc = documentService.getDocumentById(id);
        String fileName = doc.getCurrentVersion() != null ? doc.getCurrentVersion().getFileName() : "document.docx";
        String protocolPrefix = "ms-word:ofe|u|";
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            protocolPrefix = "ms-excel:ofe|u|";
        } else if (fileName.endsWith(".pptx") || fileName.endsWith(".ppt")) {
            protocolPrefix = "ms-powerpoint:ofe|u|";
        }

        String desktopUri = protocolPrefix + "http://localhost:8081/api/v1/documents/" + id + "/download";
        return ResponseEntity.ok(java.util.Map.of(
                "documentId", id.toString(),
                "fileName", fileName,
                "desktopUri", desktopUri,
                "supportedApp", protocolPrefix.split(":")[0],
                "webdavRequirementNote", "Automatic background sync-back requires Microsoft Office WebDAV/Graph integration endpoint."
        ));
    }

    @PostMapping("/{id}/desktop-checkin")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_DESKTOP_SYNC", resourceType = "DOCUMENT")
    public ResponseEntity<Document> desktopCheckInVersion(@PathVariable UUID id,
                                                          @RequestParam("file") MultipartFile file,
                                                          @RequestParam(value = "changeSummary", defaultValue = "Synced from desktop app.") String changeSummary) {
        String username = SecurityUtils.getCurrentUsername();
        Document doc = documentService.createDesktopCheckInVersion(id, file, changeSummary, username);
        return ResponseEntity.ok(doc);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_COMMENT_ADD", resourceType = "DOCUMENT")
    public ResponseEntity<java.util.Map<String, Object>> addDocumentComment(@PathVariable UUID id, @RequestBody java.util.Map<String, String> payload) {
        return ResponseEntity.ok(java.util.Map.of("id", UUID.randomUUID().toString(), "content", payload.getOrDefault("content", ""), "author", SecurityUtils.getCurrentUsername()));
    }
}
