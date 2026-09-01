package com.enterprise.kms.controller;

import com.enterprise.kms.service.HrEmployeeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/employees")
public class HrEmployeeController {

    private final HrEmployeeService hrService;

    public HrEmployeeController(HrEmployeeService hrService) {
        this.hrService = hrService;
    }

    private String getUsername(Jwt jwt) {
        if (jwt == null) return "anonymous";
        String preferred = jwt.getClaimAsString("preferred_username");
        return preferred != null ? preferred : jwt.getSubject();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR', 'VIEWER')")
    public ResponseEntity<Page<Map<String, Object>>> listEmployees(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "username,asc") String sort) {
        String[] sortParts = sort.split(",");
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        String property = sortParts[0];

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(hrService.listEmployees(query, departmentId, status, managerId, pageRequest));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getEmployeeProfile(@PathVariable UUID id) {
        return ResponseEntity.ok(hrService.getEmployeeProfile(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER')")
    public ResponseEntity<Map<String, Object>> updateEmployeeHrInfo(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(hrService.updateEmployeeHrInfo(id, payload, getUsername(jwt)));
    }

    @GetMapping("/{id}/knowledge")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getEmployeeKnowledge(@PathVariable UUID id) {
        return ResponseEntity.ok(hrService.getEmployeeKnowledgeAndTransfers(id));
    }
}
