package com.enterprise.kms.controller;

import com.enterprise.kms.entity.KnowledgeTransferCase;
import com.enterprise.kms.service.KnowledgeTransferService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/knowledge-transfer")
public class KnowledgeTransferController {

    private final KnowledgeTransferService transferService;

    public KnowledgeTransferController(KnowledgeTransferService transferService) {
        this.transferService = transferService;
    }

    private String getUsername(Jwt jwt) {
        if (jwt == null) return "anonymous";
        String preferred = jwt.getClaimAsString("preferred_username");
        return preferred != null ? preferred : jwt.getSubject();
    }

    @GetMapping("/cases")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Map<String, Object>>> listCases(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) UUID successorId,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        String[] sortParts = sort.split(",");
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = sortParts[0];

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(transferService.listCases(employeeId, managerId, successorId, departmentId, status, search, pageRequest));
    }

    @PostMapping("/cases")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> createCase(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        KnowledgeTransferCase created = transferService.createCase(payload, getUsername(jwt));
        return ResponseEntity.ok(transferService.caseToResponse(created));
    }

    @GetMapping("/cases/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getCase(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.getCaseDetails(id));
    }

    @PutMapping("/cases/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateCase(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateCase(id, payload, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/successor")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> assignSuccessor(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String successorIdStr = (String) payload.get("successorId");
        if (successorIdStr == null || successorIdStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(transferService.assignSuccessor(id, UUID.fromString(successorIdStr.trim()), getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/plan")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getPlan(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.getPlan(id));
    }

    @PutMapping("/cases/{id}/plan")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> savePlan(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.saveOrUpdatePlan(id, payload, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/checklist")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getChecklist(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.getChecklist(id));
    }

    @PostMapping("/cases/{id}/checklist")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> addChecklistItem(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.addChecklistItem(id, payload, getUsername(jwt)));
    }

    @PutMapping("/checklist/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> updateChecklistItem(
            @PathVariable UUID itemId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateChecklistItem(itemId, payload, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listSubmissions(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.listSubmissions(id));
    }

    @PostMapping("/cases/{id}/submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> submitKnowledge(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.submitKnowledge(id, payload, getUsername(jwt)));
    }

    @PutMapping("/submissions/{submissionId}/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER')")
    public ResponseEntity<Map<String, Object>> validateKnowledge(
            @PathVariable UUID submissionId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.validateKnowledge(submissionId, payload, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listSessions(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.listSessions(id));
    }

    @PostMapping("/cases/{id}/sessions")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> scheduleSession(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.scheduleSession(id, payload, getUsername(jwt)));
    }

    @PutMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateSession(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateSession(sessionId, payload, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/clearance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getClearance(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.calculateExitClearance(id));
    }

    @PostMapping("/cases/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER')")
    public ResponseEntity<Map<String, Object>> completeTransfer(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.completeTransfer(id, payload, getUsername(jwt)));
    }
}
