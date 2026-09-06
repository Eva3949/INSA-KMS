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
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @AuthenticationPrincipal Jwt jwt) {
        String[] sortParts = sort.split(",");
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = sortParts[0];

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(transferService.listCases(employeeId, managerId, successorId, departmentId, status, search, pageRequest, getUsername(jwt)));
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
    public ResponseEntity<Map<String, Object>> getCase(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.getCaseDetails(id, getUsername(jwt)));
    }

    @PutMapping("/cases/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateCase(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateCase(id, payload, getUsername(jwt)));
    }

    @DeleteMapping("/cases/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCase(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        transferService.deleteCase(id, getUsername(jwt));
        return ResponseEntity.noContent().build();
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
    public ResponseEntity<Map<String, Object>> getPlan(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.getPlan(id, getUsername(jwt)));
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
    public ResponseEntity<List<Map<String, Object>>> getChecklist(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.getChecklist(id, getUsername(jwt)));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateChecklistItem(
            @PathVariable UUID itemId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateChecklistItem(itemId, payload, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listSubmissions(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listSubmissions(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
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
    public ResponseEntity<List<Map<String, Object>>> listSessions(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listSessions(id, getUsername(jwt)));
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

    @PutMapping("/submissions/{submissionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateSubmission(
            @PathVariable UUID submissionId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateSubmission(submissionId, payload, getUsername(jwt)));
    }

    // --- Inventory Items ---
    @GetMapping("/cases/{id}/inventory")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listInventory(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listInventoryItems(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/inventory")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> addInventoryItem(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.addInventoryItem(id, payload, getUsername(jwt)));
    }

    @PutMapping("/inventory/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateInventoryItem(
            @PathVariable UUID itemId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateInventoryItem(itemId, payload, getUsername(jwt)));
    }

    @DeleteMapping("/inventory/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Void> deleteInventoryItem(
            @PathVariable UUID itemId,
            @AuthenticationPrincipal Jwt jwt) {
        transferService.deleteInventoryItem(itemId, getUsername(jwt));
        return ResponseEntity.noContent().build();
    }

    // --- Document Handover & Library Integration ---
    @GetMapping("/employees/{employeeId}/documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<List<Map<String, Object>>> listAuthoredDocumentsByEmployee(
            @PathVariable UUID employeeId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listAuthoredDocumentsByEmployee(employeeId, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/employee-documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<List<Map<String, Object>>> listEmployeeDocuments(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listEmployeeDocuments(id, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/documents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listCaseDocuments(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listCaseDocuments(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/documents/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<List<Map<String, Object>>> attachDocumentsBatch(
            @PathVariable UUID id,
            @RequestBody Object payload,
            @AuthenticationPrincipal Jwt jwt) {
        List<Map<String, Object>> documents = null;
        if (payload instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> list = (List<Map<String, Object>>) payload;
            documents = list;
        } else if (payload instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) payload;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> list = (List<Map<String, Object>>) map.get("documents");
            if (list == null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> alt = (List<Map<String, Object>>) map.get("selectedDocuments");
                list = alt;
            }
            documents = list;
        }
        if (documents == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(transferService.attachDocumentsBatch(id, documents, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> attachDocument(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String docIdStr = (String) payload.get("documentId");
        if (docIdStr == null || docIdStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        UUID documentId = UUID.fromString(docIdStr.trim());
        String transferAction = (String) payload.getOrDefault("transferAction", "REFERENCE");
        String notes = (String) payload.get("notes");
        return ResponseEntity.ok(transferService.attachDocument(id, documentId, transferAction, notes, getUsername(jwt)));
    }

    @DeleteMapping("/cases/{id}/documents/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Void> detachDocument(
            @PathVariable UUID id,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal Jwt jwt) {
        transferService.detachDocument(id, documentId, getUsername(jwt));
        return ResponseEntity.noContent().build();
    }

    // --- Asset Handover ---
    @GetMapping("/cases/{id}/assets")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listAssets(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listAssets(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/assets")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> addAsset(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.addAsset(id, payload, getUsername(jwt)));
    }

    @PutMapping("/assets/{assetId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateAsset(
            @PathVariable UUID assetId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateAsset(assetId, payload, getUsername(jwt)));
    }

    // --- Access Reviews ---
    @GetMapping("/cases/{id}/access-reviews")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listAccessReviews(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.listAccessReviews(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/access-reviews")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> addAccessReview(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.addAccessReview(id, payload, getUsername(jwt)));
    }

    @PutMapping("/access-reviews/{reviewId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> updateAccessReview(
            @PathVariable UUID reviewId,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.updateAccessReview(reviewId, payload, getUsername(jwt)));
    }

    // --- Workflow Reviews & Successor Acceptance ---
    @PostMapping("/cases/{id}/submit-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Map<String, Object>> submitForReview(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.submitForReview(id, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/manager-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER')")
    public ResponseEntity<Map<String, Object>> managerReview(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        boolean approved = Boolean.TRUE.equals(payload.get("approved"));
        String comments = (String) payload.get("comments");
        return ResponseEntity.ok(transferService.managerReview(id, approved, comments, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/hr-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_OWNER')")
    public ResponseEntity<Map<String, Object>> hrReview(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        boolean approved = Boolean.TRUE.equals(payload.get("approved"));
        String comments = (String) payload.get("comments");
        return ResponseEntity.ok(transferService.hrReview(id, approved, comments, getUsername(jwt)));
    }

    @PostMapping("/cases/{id}/successor-acceptance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> successorAcceptance(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        boolean accepted = Boolean.TRUE.equals(payload.get("accepted"));
        String comments = (String) payload.get("notes");
        if (comments == null) {
            comments = (String) payload.get("comments");
        }
        return ResponseEntity.ok(transferService.successorAcceptance(id, accepted, comments, getUsername(jwt)));
    }

    // --- Audit Trail ---
    @GetMapping("/cases/{id}/audit-logs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getCaseAuditLogs(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.getCaseAuditLogs(id, getUsername(jwt)));
    }

    @GetMapping("/cases/{id}/clearance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getClearance(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(transferService.calculateExitClearance(id, getUsername(jwt)));
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
