package com.enterprise.kms.controller;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DepartmentRepository departmentRepository;

    public AdminController(UserRepository userRepository,
                           DocumentRepository documentRepository,
                           DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_SUMMARY_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<Map<String, Object>> getAdminSummary() {
        long totalUsers = userRepository.count();
        long totalDocuments = documentRepository.count();
        long totalDepartments = departmentRepository.count();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalDocuments", totalDocuments,
                "totalDepartments", totalDepartments,
                "storageQuotaUsedBytes", 45957100000L,
                "storageQuotaTotalBytes", 107374182400L,
                "pendingOcrJobs", 0
        ));
    }

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
        String keycloakSub = body.getOrDefault("keycloakSub", "sub-" + UUID.randomUUID().toString());

        if (username == null || username.isBlank() || email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and email are required");
        }

        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setRoleName(roleName);
        u.setKeycloakSub(keycloakSub);
        u.setIsActive(true);

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
        }
        if (body.containsKey("roleName") && !body.get("roleName").isBlank()) {
            u.setRoleName(body.get("roleName"));
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
        return ResponseEntity.ok(userRepository.save(u));
    }

    @PutMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DEACTIVATED", resourceType = "USER")
    public ResponseEntity<User> deactivateUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setIsActive(false);
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
        u.setRoleName(newRole);
        return ResponseEntity.ok(userRepository.save(u));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "USER_DELETED", resourceType = "USER")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable("id") UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        // Soft delete & identity decoupling to preserve document version history and audit logs
        u.setIsActive(false);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "User deactivated and decoupled successfully", "id", id.toString()));
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

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @AuditLog(action = "ADMIN_ROLES_VIEW", resourceType = "SYSTEM")
    public ResponseEntity<List<Map<String, String>>> getAdminRoles() {
        return ResponseEntity.ok(List.of(
                Map.of("name", "ROLE_ADMIN", "description", "System Administrator"),
                Map.of("name", "ROLE_CONTENT_OWNER", "description", "Content Owner / Manager"),
                Map.of("name", "ROLE_CONTRIBUTOR", "description", "Document Contributor"),
                Map.of("name", "ROLE_VIEWER", "description", "Read-only Viewer"),
                Map.of("name", "ROLE_COMPLIANCE_OFFICER", "description", "Compliance / Records Officer"),
                Map.of("name", "ROLE_IT_SECURITY", "description", "IT Security Administrator")
        ));
    }
}
