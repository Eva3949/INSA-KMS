package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/folders")
public class FolderController {

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "FOLDER_VIEW", resourceType = "FOLDER")
    public ResponseEntity<Map<String, Object>> getFolderById(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of(
                "id", id.toString(),
                "name", "Root Repository",
                "confidentialityLevel", "INTERNAL",
                "isDeleted", false
        ));
    }
}
