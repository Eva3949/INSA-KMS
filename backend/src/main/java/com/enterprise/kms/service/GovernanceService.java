package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.LegalHold;
import com.enterprise.kms.entity.LegalHoldItem;
import com.enterprise.kms.entity.LegalHoldItemId;
import com.enterprise.kms.entity.RetentionPolicy;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.LegalHoldItemRepository;
import com.enterprise.kms.repository.LegalHoldRepository;
import com.enterprise.kms.repository.RetentionPolicyRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GovernanceService {
    private final RetentionPolicyRepository retentionPolicyRepository;
    private final LegalHoldRepository legalHoldRepository;
    private final LegalHoldItemRepository legalHoldItemRepository;
    private final DocumentRepository documentRepository;
    private final com.enterprise.kms.repository.DocumentTypeRepository documentTypeRepository;
    private final UserRepository userRepository;

    public GovernanceService(RetentionPolicyRepository retentionPolicyRepository,
                             LegalHoldRepository legalHoldRepository,
                             LegalHoldItemRepository legalHoldItemRepository,
                             DocumentRepository documentRepository,
                             com.enterprise.kms.repository.DocumentTypeRepository documentTypeRepository,
                             UserRepository userRepository) {
        this.retentionPolicyRepository = retentionPolicyRepository;
        this.legalHoldRepository = legalHoldRepository;
        this.legalHoldItemRepository = legalHoldItemRepository;
        this.documentRepository = documentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.userRepository = userRepository;
    }

    public List<RetentionPolicy> getRetentionPolicies() {
        return retentionPolicyRepository.findAll();
    }

    @Transactional
    public RetentionPolicy createRetentionPolicy(String name, String description, UUID documentTypeId,
                                                 Integer retentionDays, String dispositionAction) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Policy name is required");
        }
        if (retentionPolicyRepository.findByName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A policy with this name already exists");
        }
        if (retentionDays == null || retentionDays < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "retentionDays must be a positive integer");
        }

        RetentionPolicy policy = new RetentionPolicy();
        policy.setName(name);
        policy.setDescription(description);
        applyDocumentType(policy, documentTypeId);
        validateDisposition(dispositionAction != null ? dispositionAction : "ARCHIVE");
        policy.setDispositionAction(dispositionAction != null ? dispositionAction.toUpperCase() : "ARCHIVE");
        policy.setRetentionDays(retentionDays);
        return retentionPolicyRepository.save(policy);
    }

    @Transactional
    public RetentionPolicy updateRetentionPolicy(UUID id, String name, String description, UUID documentTypeId,
                                                 Integer retentionDays, String dispositionAction, Boolean isActive) {
        RetentionPolicy policy = retentionPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Retention policy not found"));

        if (name != null && !name.isBlank()) {
            policy.setName(name);
        }
        if (description != null) {
            policy.setDescription(description);
        }
        if (documentTypeId != null) {
            applyDocumentType(policy, documentTypeId);
        }
        if (retentionDays != null) {
            if (retentionDays < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "retentionDays must be a positive integer");
            }
            policy.setRetentionDays(retentionDays);
        }
        if (dispositionAction != null && !dispositionAction.isBlank()) {
            validateDisposition(dispositionAction);
            policy.setDispositionAction(dispositionAction.toUpperCase());
        }
        if (isActive != null) {
            policy.setIsActive(isActive);
        }
        return retentionPolicyRepository.save(policy);
    }

    @Transactional
    public void deleteRetentionPolicy(UUID id) {
        if (!retentionPolicyRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Retention policy not found");
        }
        retentionPolicyRepository.deleteById(id);
    }

    private void applyDocumentType(RetentionPolicy policy, UUID documentTypeId) {
        com.enterprise.kms.entity.DocumentType type = documentTypeRepository.findById(documentTypeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        policy.setDocumentType(type);
    }

    private void validateDisposition(String action) {
        String upper = action.toUpperCase();
        if (!"ARCHIVE".equals(upper) && !"PURGE".equals(upper) && !"REVIEW".equals(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "dispositionAction must be one of ARCHIVE, PURGE or REVIEW");
        }
    }

    public List<LegalHold> getLegalHolds() {
        return legalHoldRepository.findAll();
    }

    @Transactional
    public LegalHold createLegalHold(String caseNumber, String title, String description, String username) {
        User creator = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        LegalHold hold = new LegalHold();
        hold.setCaseNumber(caseNumber);
        hold.setTitle(title);
        hold.setDescription(description);
        hold.setCreatedBy(creator);
        return legalHoldRepository.save(hold);
    }

    @Transactional
    public LegalHold releaseLegalHold(UUID id) {
        LegalHold hold = legalHoldRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Legal hold not found"));
        if (Boolean.FALSE.equals(hold.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Legal hold is already released");
        }
        hold.setIsActive(false);
        hold.setReleasedAt(OffsetDateTime.now());
        return legalHoldRepository.save(hold);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHoldItems(UUID holdId) {
        LegalHold hold = legalHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Legal hold not found"));
        return legalHoldItemRepository.findByIdLegalHoldId(hold.getId()).stream()
                .map(item -> {
                    Document doc = item.getDocument();
                    Map<String, Object> row = new java.util.LinkedHashMap<>();
                    row.put("documentId", doc.getId());
                    row.put("title", doc.getTitle());
                    row.put("confidentialityLevel", doc.getConfidentialityLevel());
                    row.put("status", doc.getStatus());
                    row.put("isDeleted", doc.getIsDeleted());
                    row.put("placedAt", item.getPlacedAt());
                    return row;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public LegalHoldItem addDocumentToHold(UUID holdId, UUID documentId) {
        LegalHold hold = legalHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Legal hold not found"));
        if (Boolean.FALSE.equals(hold.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot add items to a released legal hold");
        }
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        LegalHoldItemId itemId = new LegalHoldItemId(hold.getId(), document.getId());
        if (legalHoldItemRepository.existsById(itemId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already under this legal hold");
        }

        LegalHoldItem item = new LegalHoldItem();
        item.setId(itemId);
        item.setLegalHold(hold);
        item.setDocument(document);
        return legalHoldItemRepository.save(item);
    }

    @Transactional
    public void removeDocumentFromHold(UUID holdId, UUID documentId) {
        LegalHoldItemId itemId = new LegalHoldItemId(holdId, documentId);
        if (!legalHoldItemRepository.existsById(itemId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document is not under this legal hold");
        }
        legalHoldItemRepository.deleteById(itemId);
    }
}
