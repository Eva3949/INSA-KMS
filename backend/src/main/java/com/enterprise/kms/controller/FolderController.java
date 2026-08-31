package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.Folder;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.entity.Subscription;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.FolderRepository;
import com.enterprise.kms.repository.SubscriptionRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/folders")
public class FolderController {

    private final FolderRepository folderRepository;
    private final DepartmentRepository departmentRepository;
    private final PermissionService permissionService;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;

    public FolderController(FolderRepository folderRepository,
                            DepartmentRepository departmentRepository,
                            PermissionService permissionService,
                            UserRepository userRepository,
                            SubscriptionRepository subscriptionRepository) {
        this.folderRepository = folderRepository;
        this.departmentRepository = departmentRepository;
        this.permissionService = permissionService;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    /** Folders the caller is allowed to see (FR-16 applied to the folder tree). */
    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "FOLDER_LIST", resourceType = "FOLDER")
    public ResponseEntity<List<Map<String, Object>>> listFolders() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Folder folder : folderRepository.findByIsDeletedFalseOrderByNameAsc()) {
            try {
                permissionService.requireFolderAccess(folder.getId(), PermissionService.VIEW);
            } catch (ResponseStatusException denied) {
                continue;
            }
            rows.add(toMap(folder));
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "FOLDER_VIEW", resourceType = "FOLDER")
    public ResponseEntity<Map<String, Object>> getFolderById(@PathVariable UUID id) {
        Folder folder = permissionService.requireFolderAccess(id, PermissionService.VIEW);
        return ResponseEntity.ok(toMap(folder));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    @AuditLog(action = "FOLDER_CREATED", resourceType = "FOLDER")
    public ResponseEntity<Map<String, Object>> createFolder(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name is required");
        }

        PermissionService.Caller caller = permissionService.currentCaller();
        User owner = caller.user;

        Department department;
        String departmentId = body.get("departmentId");
        if (departmentId != null && !departmentId.isBlank()) {
            department = departmentRepository.findById(UUID.fromString(departmentId))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        } else if (owner.getDepartment() != null) {
            department = owner.getDepartment();
        } else {
            department = departmentRepository.findByCode("GEN")
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "departmentId is required (caller has no department)"));
        }

        Folder folder = new Folder();
        folder.setName(name.trim());
        folder.setDepartment(department);
        folder.setOwner(owner);
        folder.setConfidentialityLevel(body.getOrDefault("confidentialityLevel", "INTERNAL"));

        String parentId = body.get("parentId");
        if (parentId != null && !parentId.isBlank()) {
            Folder parent = permissionService.requireFolderAccess(UUID.fromString(parentId), PermissionService.EDIT);
            folder.setParent(parent);
        }

        Folder saved = folderRepository.save(folder);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(saved));
    }

    private Map<String, Object> toMap(Folder folder) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", folder.getId());
        row.put("name", folder.getName());
        row.put("parentId", folder.getParent() != null ? folder.getParent().getId() : null);
        row.put("departmentId", folder.getDepartment() != null ? folder.getDepartment().getId() : null);
        row.put("departmentName", folder.getDepartment() != null ? folder.getDepartment().getName() : null);
        row.put("ownerUsername", folder.getOwner() != null ? folder.getOwner().getUsername() : null);
        row.put("confidentialityLevel", folder.getConfidentialityLevel());
        row.put("isDeleted", folder.getIsDeleted());
        row.put("createdAt", folder.getCreatedAt());
        return row;
    }

    // ===== FR-26: Folder Subscriptions =====

    @PostMapping("/{id}/subscribe")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> subscribeFolder(
            @PathVariable("id") UUID folderId,
            @RequestBody(required = false) Map<String, Boolean> body) {
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Subscription sub = subscriptionRepository
                .findByUserIdAndTargetTypeAndTargetId(user.getId(), "FOLDER", folderId)
                .orElseGet(() -> {
                    Subscription s = new Subscription();
                    s.setUser(user);
                    s.setTargetType("FOLDER");
                    s.setTargetId(folderId);
                    return s;
                });

        if (body != null) {
            if (body.containsKey("notifyVersions")) sub.setNotifyVersions(body.get("notifyVersions"));
            if (body.containsKey("notifyComments")) sub.setNotifyComments(body.get("notifyComments"));
            if (body.containsKey("notifyShares")) sub.setNotifyShares(body.get("notifyShares"));
        }

        Subscription saved = subscriptionRepository.save(sub);
        return ResponseEntity.ok(Map.of(
                "subscribed", true,
                "subscriptionId", saved.getId().toString(),
                "notifyVersions", saved.getNotifyVersions(),
                "notifyComments", saved.getNotifyComments(),
                "notifyShares", saved.getNotifyShares()
        ));
    }

    @DeleteMapping("/{id}/subscribe")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> unsubscribeFolder(@PathVariable("id") UUID folderId) {
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        subscriptionRepository.deleteByUserIdAndTargetTypeAndTargetId(user.getId(), "FOLDER", folderId);
        return ResponseEntity.ok(Map.of("subscribed", false));
    }

    @GetMapping("/{id}/subscribe/status")
    @PreAuthorize("hasAnyRole('ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> folderSubscriptionStatus(@PathVariable("id") UUID folderId) {
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        var opt = subscriptionRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), "FOLDER", folderId);
        if (opt.isPresent()) {
            var sub = opt.get();
            return ResponseEntity.ok(Map.of(
                    "subscribed", true,
                    "subscriptionId", sub.getId().toString(),
                    "notifyVersions", sub.getNotifyVersions(),
                    "notifyComments", sub.getNotifyComments(),
                    "notifyShares", sub.getNotifyShares()));
        }
        return ResponseEntity.ok(Map.of("subscribed", false));
    }
}
