package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.entity.Tag;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.AuditLogRepository;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AdminCatalogService;
import com.enterprise.kms.service.KeycloakAdminService;
import com.enterprise.kms.service.ReportsService;
import com.enterprise.kms.service.RetentionDispositionJob;
import com.enterprise.kms.service.SystemSettingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DepartmentRepository departmentRepository;
    private final StorageObjectRepository storageObjectRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminCatalogService adminCatalogService;
    private final SystemSettingService systemSettingService;
    private final ReportsService reportsService;
    private final RetentionDispositionJob retentionDispositionJob;
    private final KeycloakAdminService keycloakAdminService;

    public AdminController(UserRepository userRepository,
                           DocumentRepository documentRepository,
                           DepartmentRepository departmentRepository,
                           StorageObjectRepository storageObjectRepository,
                           AuditLogRepository auditLogRepository,
                           AdminCatalogService adminCatalogService,
                           SystemSettingService systemSettingService,
                           ReportsService reportsService,
                           RetentionDispositionJob retentionDispositionJob,
                           KeycloakAdminService keycloakAdminService) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.departmentRepository = departmentRepository;
        this.storageObjectRepository = storageObjectRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminCatalogService = adminCatalogService;
        this.systemSettingService = systemSettingService;
        this.reportsService = reportsService;
        this.retentionDispositionJob = retentionDispositionJob;
        this.keycloakAdminService = keycloakAdminService;
    }

    // ================= Dashboard Summary =================

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_SUMMARY_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getAdminSummary() {
        long totalUsers = userRepository.count();
        long totalDocuments = documentRepository.count();
        long totalDepartments = departmentRepository.count();
        long totalStorageBytes = storageObjectRepository.sumTotalBytes();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalDocuments", totalDocuments,
                "totalDepartments", totalDepartments,
                "storageQuotaUsedBytes", totalStorageBytes,
                "storageQuotaTotalBytes", 107374182400L,
                "pendingOcrJobs", 0
        ));
    }

    // ================= Users (existing, unchanged) =================

    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_USERS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<User>> getAdminUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_VIEW", resourceType = "USER")
    public ResponseEntity<User> getUserById(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(u);
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_CREATED", resourceType = "USER")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String roleName = body.getOrDefault("roleName", "ROLE_VIEWER");
        String temporaryPassword = body.get("temporaryPassword");

        if (username == null || username.isBlank() || email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and email are required");
        }
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this username already exists");
        }

        // FR-18/FR-27: provision in Keycloak first — a user that only exists in the KMS
        // database cannot authenticate, and its role would carry no authority.
        String keycloakSub = keycloakAdminService.createUser(
                username, email, body.get("firstName"), body.get("lastName"),
                temporaryPassword, roleName, true);
        if (keycloakSub == null) {
            keycloakSub = body.getOrDefault("keycloakSub", "sub-" + UUID.randomUUID());
        }

        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setRoleName(roleName);
        u.setKeycloakSub(keycloakSub);
        u.setIsActive(true);
        if (body.containsKey("departmentId") && body.get("departmentId") != null && !body.get("departmentId").isBlank()) {
            Department dept = departmentRepository.findById(UUID.fromString(body.get("departmentId")))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            u.setDepartment(dept);
        }

        User saved = userRepository.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_UPDATED", resourceType = "USER")
    public ResponseEntity<User> updateUser(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (body.containsKey("username") && !body.get("username").isBlank()) {
            u.setUsername(body.get("username"));
        }
        if (body.containsKey("email") && !body.get("email").isBlank()) {
            u.setEmail(body.get("email"));
            keycloakAdminService.updateProfile(
                    keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), body.get("email"));
        }
        if (body.containsKey("roleName") && !body.get("roleName").isBlank()) {
            u.setRoleName(body.get("roleName"));
            keycloakAdminService.assignRealmRoles(
                    keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), body.get("roleName"));
        }
        if (body.containsKey("departmentId") && !body.get("departmentId").isBlank()) {
            Department dept = departmentRepository.findById(UUID.fromString(body.get("departmentId")))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            u.setDepartment(dept);
        }

        User saved = userRepository.save(u);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/users/{id}/activate")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_ACTIVATED", resourceType = "USER")
    public ResponseEntity<User> activateUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setIsActive(true);
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), true);
        return ResponseEntity.ok(userRepository.save(u));
    }

    @PutMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DEACTIVATED", resourceType = "USER")
    public ResponseEntity<User> deactivateUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setIsActive(false);
        // FR-27 offboarding: disabling in the IdP is what actually revokes access
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), false);
        return ResponseEntity.ok(userRepository.save(u));
    }

    @PutMapping("/users/{id}/roles")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_ROLE_CHANGED", resourceType = "USER")
    public ResponseEntity<User> changeUserRole(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String newRole = body.get("roleName");
        if (newRole == null || newRole.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roleName is required");
        }
        // Realm role mapping is the source of truth for authorisation (FR-18)
        keycloakAdminService.assignRealmRoles(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), newRole);
        u.setRoleName(newRole);
        return ResponseEntity.ok(userRepository.save(u));
    }

    @PutMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_PASSWORD_RESET", resourceType = "USER")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable("id") UUID id,
                                                                 @RequestBody Map<String, String> body) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String password = body.get("password");
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must be at least 8 characters");
        }
        boolean temporary = !"false".equalsIgnoreCase(body.getOrDefault("temporary", "true"));
        keycloakAdminService.resetPassword(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), password, temporary);
        return ResponseEntity.ok(Map.of("message", "Password reset in Keycloak", "username", u.getUsername()));
    }

    @GetMapping("/identity-provider/health")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "IDP_HEALTH_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getIdentityProviderHealth() {
        return ResponseEntity.ok(keycloakAdminService.health());
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DELETED", resourceType = "USER")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Soft delete & identity decoupling to preserve document version history and audit logs
        u.setIsActive(false);
        keycloakAdminService.setEnabled(
                keycloakAdminService.resolveUserId(u.getKeycloakSub(), u.getUsername()), false);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "User deactivated in KMS and disabled in Keycloak", "id", id.toString()));
    }

    @GetMapping("/users/search")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_SEARCH", resourceType = "USER")
    public ResponseEntity<List<User>> searchUsers(@RequestParam(name = "q", defaultValue = "") String q) {
        if (q.isBlank()) {
            return ResponseEntity.ok(userRepository.findAll());
        }
        return ResponseEntity.ok(userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q));
    }

    // ================= Roles & Permissions Matrix (Section 8) =================

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_ROLES_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getAdminRoles() {
        List<Map<String, Object>> roles = List.of(
                roleEntry("ROLE_ADMIN", "System Administrator"),
                roleEntry("ROLE_CONTENT_OWNER", "Content Owner / Manager"),
                roleEntry("ROLE_CONTRIBUTOR", "Document Contributor"),
                roleEntry("ROLE_VIEWER", "Read-only Viewer"),
                roleEntry("ROLE_COMPLIANCE_OFFICER", "Compliance / Records Officer"),
                roleEntry("ROLE_IT_SECURITY", "IT Security Administrator")
        );
        return ResponseEntity.ok(roles);
    }

    private Map<String, Object> roleEntry(String name, String description) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("name", name);
        entry.put("description", description);
        entry.put("userCount", userRepository.countByRoleName(name));
        return entry;
    }

    // ================= Departments & Quotas (FR-27) =================

    @GetMapping("/departments")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getDepartments() {
        return ResponseEntity.ok(adminCatalogService.getDepartmentsWithUsage());
    }

    @PostMapping("/departments")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Department> createDepartment(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String code = (String) body.get("code");
        Long quotaBytes = body.get("storageQuotaBytes") != null
                ? Long.valueOf(body.get("storageQuotaBytes").toString()) : null;
        Department saved = adminCatalogService.createDepartment(name, code, quotaBytes);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Department> updateDepartment(@PathVariable("id") UUID id,
                                                       @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String code = (String) body.get("code");
        Long quotaBytes = body.get("storageQuotaBytes") != null
                ? Long.valueOf(body.get("storageQuotaBytes").toString()) : null;
        return ResponseEntity.ok(adminCatalogService.updateDepartment(id, name, code, quotaBytes));
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DEPARTMENT_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteDepartment(@PathVariable("id") UUID id) {
        adminCatalogService.deleteDepartment(id);
        return ResponseEntity.ok(Map.of("message", "Department deleted successfully", "id", id.toString()));
    }

    // ================= Document Types (FR-06 / Section 9) =================

    @GetMapping("/document-types")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "DOCUMENT_TYPE_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getDocumentTypes() {
        return ResponseEntity.ok(adminCatalogService.getDocumentTypesWithUsage());
    }

    @PostMapping("/document-types")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_TYPE_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<DocumentType> createDocumentType(@RequestBody Map<String, String> body) {
        DocumentType saved = adminCatalogService.createDocumentType(body.get("name"), body.get("description"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/document-types/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_TYPE_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<DocumentType> updateDocumentType(@PathVariable("id") UUID id,
                                                           @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminCatalogService.updateDocumentType(id, body.get("name"), body.get("description")));
    }

    @DeleteMapping("/document-types/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "DOCUMENT_TYPE_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteDocumentType(@PathVariable("id") UUID id) {
        adminCatalogService.deleteDocumentType(id);
        return ResponseEntity.ok(Map.of("message", "Document type deleted successfully", "id", id.toString()));
    }

    // ================= Taxonomy / Tags (FR-03, FR-06) =================

    @GetMapping("/taxonomy/tags")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER')")
    @AuditLog(action = "TAG_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getTags() {
        return ResponseEntity.ok(adminCatalogService.getTagsWithUsage());
    }

    @PostMapping("/taxonomy/tags")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_CREATED", resourceType = "SYSTEM")
    public ResponseEntity<Tag> createTag(@RequestBody Map<String, String> body) {
        Tag saved = adminCatalogService.createTag(body.get("name"), body.get("category"));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/taxonomy/tags/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<Tag> updateTag(@PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminCatalogService.updateTag(id, body.get("name"), body.get("category")));
    }

    @DeleteMapping("/taxonomy/tags/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "TAG_DELETED", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, String>> deleteTag(@PathVariable("id") UUID id) {
        adminCatalogService.deleteTag(id);
        return ResponseEntity.ok(Map.of("message", "Tag deleted successfully", "id", id.toString()));
    }

    // ================= Groups (FR-27 user groups) =================

    @GetMapping("/groups")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "GROUPS_LIST_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getGroups() {
        return ResponseEntity.ok(adminCatalogService.getGroupsWithMembership());
    }

    // ================= System Configuration (FR-27) =================

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "SETTINGS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getSettings() {
        List<Map<String, Object>> rows = systemSettingService.getAllSettings().stream()
                .map(s -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("settingKey", s.getSettingKey());
                    row.put("settingValue", s.getSettingValue());
                    row.put("description", s.getDescription());
                    row.put("updatedAt", s.getUpdatedAt());
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "SETTINGS_UPDATED", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> updateSettings(@RequestBody Map<String, String> body) {
        systemSettingService.updateSettings(body);
        return getSettings();
    }

    // ================= Storage Integrity (FR-21 / NFR-06 support) =================

    @GetMapping("/storage/stats")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "STORAGE_STATS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStorageStats() {
        long totalObjects = storageObjectRepository.count();
        long totalBytes = storageObjectRepository.sumTotalBytes();
        long orphanedObjects = storageObjectRepository.countOrphanedObjects();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalObjects", totalObjects);
        stats.put("totalBytes", totalBytes);
        stats.put("orphanedObjects", orphanedObjects);
        stats.put("duplicateChecksums", storageObjectRepository.findDuplicateChecksums(10).stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("checksumSha256", r[0]);
                    row.put("copies", AdminCatalogService.toLong(r[1]));
                    row.put("wastedBytes", AdminCatalogService.toLong(r[2]));
                    return row;
                })
                .toList());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/storage/objects")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "STORAGE_OBJECTS_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, Object>>> getStorageObjects(
            @RequestParam(name = "limit", defaultValue = "50") int limit) {

        List<Map<String, Object>> rows = storageObjectRepository.findRecentObjectsWithUsage(Math.min(Math.max(limit, 1), 200))
                .stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", r[0].toString());
                    row.put("storagePath", r[1]);
                    row.put("fileSizeBytes", AdminCatalogService.toLong(r[2]));
                    row.put("checksumSha256", r[3]);
                    row.put("createdAt", r[4]);
                    row.put("versionReferences", AdminCatalogService.toLong(r[5]));
                    row.put("isOrphaned", (Boolean) r[6]);
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    // ================= IT Security Monitoring (FR-22 / Section 3) =================

    @GetMapping("/security/events")
    @PreAuthorize("hasAnyRole('ROLE_IT_SECURITY', 'ROLE_ADMIN')")
    @AuditLog(action = "SECURITY_EVENTS_VIEW", resourceType = "AUDIT")
    public ResponseEntity<Page<com.enterprise.kms.entity.AuditLogEntity>> getSecurityEvents(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "25") int size) {
        Page<com.enterprise.kms.entity.AuditLogEntity> events = auditLogRepository.findAll(
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                        Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(events);
    }

    // ================= Usage & Stale Content Reports (FR-30, FR-31) =================

    @GetMapping("/reports/storage-growth")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_STORAGE_GROWTH", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStorageGrowthReport(
            @RequestParam(name = "months", defaultValue = "12") int months) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "months", months,
                "data", reportsService.getStorageGrowth(months)
        ));
    }

    @GetMapping("/reports/active-users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_ACTIVE_USERS", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getActiveUsersReport(
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "15") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "days", days,
                "data", reportsService.getActiveUsers(days, limit)
        ));
    }

    @GetMapping("/reports/top-searches")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "REPORT_TOP_SEARCHES", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getTopSearchesReport(
            @RequestParam(name = "days", defaultValue = "30") int days,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "days", days,
                "data", reportsService.getTopSearches(days, limit)
        ));
    }

    @GetMapping("/reports/stale-content")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "REPORT_STALE_CONTENT", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getStaleContentReport(
            @RequestParam(name = "days", defaultValue = "365") int days,
            @RequestParam(name = "limit", defaultValue = "100") int limit) {
        return ResponseEntity.ok(Map.of(
                "generatedAt", OffsetDateTime.now().toString(),
                "staleThresholdDays", days,
                "data", reportsService.getStaleOrOrphanedContent(days, limit)
        ));
    }

    // ================= Manual Retention Run (FR-28) =================

    @PostMapping("/retention/run")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_COMPLIANCE_OFFICER')")
    @AuditLog(action = "RETENTION_RUN_TRIGGERED", resourceType = "GOVERNANCE")
    public ResponseEntity<Map<String, Long>> runRetentionDispositions() {
        return ResponseEntity.ok(retentionDispositionJob.runDispositions());
    }
}
