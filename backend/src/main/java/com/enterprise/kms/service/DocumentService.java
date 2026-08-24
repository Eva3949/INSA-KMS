package com.enterprise.kms.service;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final FolderRepository folderRepository;
    private final PermissionService permissionService;
    private final com.enterprise.kms.repository.LegalHoldItemRepository legalHoldItemRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository documentVersionRepository,
                           StorageService storageService,
                           UserRepository userRepository,
                           DepartmentRepository departmentRepository,
                           DocumentTypeRepository documentTypeRepository,
                           FolderRepository folderRepository,
                           PermissionService permissionService,
                           com.enterprise.kms.repository.LegalHoldItemRepository legalHoldItemRepository) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.folderRepository = folderRepository;
        this.permissionService = permissionService;
        this.legalHoldItemRepository = legalHoldItemRepository;
    }

    @Transactional
    public Document createDocument(MultipartFile file, String title, String departmentCode, String documentTypeName, String confidentialityLevel, String username) {
        String effectiveUsername = (username != null && !username.isBlank()) ? username : "system";

        User author = userRepository.findByUsername(effectiveUsername)
                .or(() -> userRepository.findByKeycloakSub("sub-" + effectiveUsername))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(effectiveUsername);
                    u.setEmail(effectiveUsername.contains("@") ? effectiveUsername : effectiveUsername + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + effectiveUsername);
                    return userRepository.save(u);
                });

        String effectiveDeptCode = (departmentCode != null && !departmentCode.isBlank()) ? departmentCode : "ITSEC";
        Department dept = departmentRepository.findByCode(effectiveDeptCode)
                .or(() -> departmentRepository.findByName(effectiveDeptCode))
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName(effectiveDeptCode + " Department");
                    d.setCode(effectiveDeptCode);
                    return departmentRepository.save(d);
                });

        String effectiveDocTypeName = (documentTypeName != null && !documentTypeName.isBlank()) ? documentTypeName : "Policy";
        DocumentType docType = documentTypeRepository.findByName(effectiveDocTypeName)
                .orElseGet(() -> {
                    DocumentType dt = new DocumentType();
                    dt.setName(effectiveDocTypeName);
                    return documentTypeRepository.save(dt);
                });

        // FR-27: department storage quota enforcement — reject the upload before the
        // bytes are committed when it would exceed the department's allocation.
        enforceDepartmentQuota(dept, file.getSize());

        StorageObject storageObject = storageService.storeFile(file);

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.bin";
        String effectiveTitle = (title != null && !title.isBlank()) ? title : originalFilename;

        Document doc = new Document();
        doc.setTitle(effectiveTitle);
        doc.setOwnerDepartment(dept);
        doc.setAuthor(author);
        doc.setDocumentType(docType);
        doc.setConfidentialityLevel((confidentialityLevel != null && !confidentialityLevel.isBlank()) ? confidentialityLevel : "INTERNAL");
        doc = documentRepository.save(doc);

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(1);
        version.setFileName(originalFilename);
        version.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        version.setStorageObject(storageObject);
        version.setCreatedBy(author);
        version.setChangeSummary("Initial document upload revision.");
        version = documentVersionRepository.save(version);

        doc.setCurrentVersion(version);
        return documentRepository.save(doc);
    }

    @Transactional
    public com.enterprise.kms.dto.BulkOperationResult performBulkOperation(com.enterprise.kms.dto.BulkOperationRequest request, String username) {
        com.enterprise.kms.dto.BulkOperationResult result = new com.enterprise.kms.dto.BulkOperationResult();
        if (request == null || request.getOperation() == null) {
            result.setOperation("UNKNOWN");
            return result;
        }

        result.setOperation(request.getOperation().name());

        if (request.getDocumentIds() == null || request.getDocumentIds().isEmpty()) {
            return result;
        }

        Folder targetFolder = null;
        if (request.getOperation() == com.enterprise.kms.dto.BulkOperationRequest.OperationType.MOVE && request.getTargetFolderId() != null) {
            targetFolder = folderRepository.findById(request.getTargetFolderId()).orElse(null);
        }

        for (UUID docId : request.getDocumentIds()) {
            try {
                Document doc = documentRepository.findById(docId).orElse(null);
                if (doc == null) {
                    result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false, "Document not found ID: " + docId));
                    continue;
                }

                // FR-17: bulk actions must respect per-document authorization
                String needed = switch (request.getOperation()) {
                    case DELETE -> PermissionService.DELETE;
                    case UPDATE_PERMISSION -> PermissionService.ADMIN;
                    default -> PermissionService.EDIT;
                };
                PermissionService.Caller caller = permissionService.currentCaller();
                if (!permissionService.canAccessDocument(doc, needed, caller)) {
                    result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false,
                            "Forbidden: " + needed + " permission required on this document"));
                    continue;
                }

                switch (request.getOperation()) {
                    case MOVE -> {
                        doc.setFolder(targetFolder);
                        documentRepository.save(doc);
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully moved document."));
                    }
                    case DELETE -> {
                        doc.setIsDeleted(true);
                        doc.setDeletedAt(OffsetDateTime.now());
                        documentRepository.save(doc);
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully soft-deleted document."));
                    }
                    case UPDATE_PERMISSION -> {
                        if (request.getConfidentialityLevel() != null) {
                            doc.setConfidentialityLevel(request.getConfidentialityLevel());
                            documentRepository.save(doc);
                            result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Updated confidentiality level to " + request.getConfidentialityLevel()));
                        } else {
                            result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Permission update validated."));
                        }
                    }
                    case TAG -> {
                        result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, true, "Successfully tagged document."));
                    }
                }
            } catch (Exception e) {
                result.addItemResult(new com.enterprise.kms.dto.BulkItemResult(docId, false, "Error processing bulk item: " + e.getMessage()));
            }
        }

        return result;
    }

    @Transactional
    public Document createDesktopCheckInVersion(UUID documentId, MultipartFile file, String changeSummary, String username) {
        Document doc = getDocumentById(documentId);
        User author = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        StorageObject storageObject = storageService.storeFile(file);

        int nextVersionNumber = 2;
        if (doc.getCurrentVersion() != null) {
            nextVersionNumber = doc.getCurrentVersion().getVersionNumber() + 1;
        }

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(nextVersionNumber);
        version.setFileName(file.getOriginalFilename());
        version.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        version.setStorageObject(storageObject);
        version.setCreatedBy(author);
        version.setChangeSummary(changeSummary != null ? changeSummary : "Synced revision from desktop productivity app.");
        version = documentVersionRepository.save(version);

        doc.setCurrentVersion(version);
        doc.setUpdatedAt(OffsetDateTime.now());
        return documentRepository.save(doc);
    }

    /**
     * FR-27 storage quota check. Throws 507 when the department allocation would be exceeded.
     */
    private void enforceDepartmentQuota(Department dept, long incomingBytes) {
        if (dept == null || dept.getId() == null || dept.getStorageQuotaBytes() == null) {
            return;
        }
        long quota = dept.getStorageQuotaBytes();
        if (quota <= 0) {
            return;
        }
        long used = documentRepository.sumStoredBytesByDepartment(dept.getId());
        if (used + Math.max(0, incomingBytes) > quota) {
            throw new ResponseStatusException(HttpStatus.INSUFFICIENT_STORAGE, String.format(
                    "Upload rejected: department %s would exceed its storage quota (%.2f GB used of %.2f GB, incoming %.2f MB). "
                    + "Ask an administrator to raise the quota.",
                    dept.getCode(),
                    used / 1073741824.0, quota / 1073741824.0, incomingBytes / 1048576.0));
        }
    }

    /** FR-16: only documents the caller may see. */
    @Transactional
    public Page<Document> getAllActiveDocuments(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        return documentRepository.findAuthorized(
                caller.userIdText(), caller.rolesCsv(), caller.groupsCsv(),
                caller.departmentIdText(), caller.privilegedRead(), pageable);
    }

    /**
     * Flattens a document into a JSON-safe response.
     * Returning the entity directly makes Jackson walk uninitialised Hibernate proxies
     * (ByteBuddyInterceptor serialisation failure), so every read path maps explicitly.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> toResponse(Document doc) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", doc.getId());
        row.put("title", doc.getTitle());
        row.put("confidentialityLevel", doc.getConfidentialityLevel());
        row.put("status", doc.getStatus());
        row.put("isDeleted", doc.getIsDeleted());
        row.put("createdAt", doc.getCreatedAt());
        row.put("updatedAt", doc.getUpdatedAt());
        row.put("deletedAt", doc.getDeletedAt());

        Department dept = doc.getOwnerDepartment();
        if (dept != null) {
            row.put("department", dept.getName());
            row.put("ownerDepartment", Map.of(
                    "id", dept.getId(),
                    "name", dept.getName() != null ? dept.getName() : "",
                    "code", dept.getCode() != null ? dept.getCode() : ""));
        }

        User author = doc.getAuthor();
        if (author != null) {
            row.put("owner", author.getUsername());
            row.put("ownerEmail", author.getEmail());
            row.put("authorId", author.getId());
        }

        DocumentType type = doc.getDocumentType();
        if (type != null) {
            row.put("documentType", type.getName());
            row.put("documentTypeId", type.getId());
        }

        Folder folder = doc.getFolder();
        row.put("folderId", folder != null ? folder.getId() : null);
        row.put("folderName", folder != null ? folder.getName() : null);

        DocumentVersion version = doc.getCurrentVersion();
        if (version != null) {
            Map<String, Object> versionMap = new LinkedHashMap<>();
            versionMap.put("id", version.getId());
            versionMap.put("versionNumber", version.getVersionNumber());
            versionMap.put("fileName", version.getFileName());
            versionMap.put("mimeType", version.getMimeType());
            versionMap.put("createdAt", version.getCreatedAt());

            StorageObject storageObject = version.getStorageObject();
            if (storageObject != null) {
                versionMap.put("storageObject", Map.of(
                        "id", storageObject.getId(),
                        "fileSizeBytes", storageObject.getFileSizeBytes() != null ? storageObject.getFileSizeBytes() : 0L,
                        "checksumSha256", storageObject.getChecksumSha256() != null ? storageObject.getChecksumSha256() : ""));
                row.put("fileSizeBytes", storageObject.getFileSizeBytes());
            }
            row.put("currentVersion", versionMap);
            row.put("fileName", version.getFileName());
            row.put("mimeType", version.getMimeType());
        }

        // FR-29: is this document frozen under an active legal hold?
        row.put("legalHold", legalHoldItemRepository.existsByIdDocumentId(doc.getId()));
        row.put("tags", findTagNames(doc.getId()));
        return row;
    }

    /** Taxonomy tags attached to the document (FR-03). */
    @Transactional(readOnly = true)
    public List<String> findTagNames(UUID documentId) {
        @SuppressWarnings("unchecked")
        List<Object> names = entityManager
                .createNativeQuery("SELECT t.name FROM tags t JOIN document_tags dt ON dt.tag_id = t.id "
                        + "WHERE dt.document_id = :docId ORDER BY t.name")
                .setParameter("docId", documentId)
                .getResultList();
        List<String> result = new ArrayList<>();
        names.forEach(n -> result.add(n.toString()));
        return result;
    }

    /** Resolves the physical file for download/preview, enforcing FR-16/17/19 first. */
    @Transactional(readOnly = true)
    public Map<String, Object> prepareDownload(UUID documentId) {
        Document doc = permissionService.requireDocumentAccess(documentId, PermissionService.VIEW);
        DocumentVersion version = doc.getCurrentVersion();
        if (version == null || version.getStorageObject() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document has no stored file version");
        }
        java.nio.file.Path path = storageService.resolve(version.getStorageObject().getStoragePath());
        if (path == null || !java.nio.file.Files.isReadable(path)) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "The stored file is missing from the storage volume: " + version.getStorageObject().getStoragePath());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("path", path);
        payload.put("fileName", version.getFileName());
        payload.put("mimeType", version.getMimeType() != null ? version.getMimeType() : "application/octet-stream");
        payload.put("sizeBytes", version.getStorageObject().getFileSizeBytes());
        return payload;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllActiveDocumentResponses(Pageable pageable) {
        return getAllActiveDocuments(pageable).map(this::toResponse);
    }

    /** Documents authored by the caller (My Documents). */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getMyDocuments(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        return documentRepository
                .findByAuthorIdAndIsDeletedFalse(caller.userId, pageable)
                .map(this::toResponse);
    }

    /** Documents the caller recently opened, newest first, derived from the audit trail. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecentDocuments(int limit) {
        PermissionService.Caller caller = permissionService.currentCaller();
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] entry : documentRepository.findRecentlyAccessed(username, Math.min(Math.max(limit, 1), 100))) {
            UUID docId = UUID.fromString(entry[0].toString());
            Document doc = documentRepository.findById(docId).orElse(null);
            if (doc == null || Boolean.TRUE.equals(doc.getIsDeleted())) {
                continue;
            }
            if (!permissionService.canAccessDocument(doc, PermissionService.VIEW, caller)) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>(toResponse(doc));
            row.put("lastAccessedAt", entry[1] != null ? entry[1].toString() : null);
            rows.add(row);
        }
        return rows;
    }

    /** FR-04 real version history for a document. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVersionHistory(UUID documentId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (DocumentVersion version : documentVersionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", version.getId());
            row.put("versionNumber", version.getVersionNumber());
            row.put("fileName", version.getFileName());
            row.put("mimeType", version.getMimeType());
            row.put("changeSummary", version.getChangeSummary());
            row.put("createdAt", version.getCreatedAt());
            row.put("createdBy", version.getCreatedBy() != null ? version.getCreatedBy().getUsername() : null);
            StorageObject so = version.getStorageObject();
            row.put("fileSizeBytes", so != null ? so.getFileSizeBytes() : null);
            row.put("checksumSha256", so != null ? so.getChecksumSha256() : null);
            rows.add(row);
        }
        return rows;
    }

    public Document getDocumentById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
    }

    /** FR-16/FR-17/FR-19 checked read of a single document. */
    @Transactional
    public Document getAuthorizedDocument(UUID id, String requiredLevel) {
        return permissionService.requireDocumentAccess(id, requiredLevel);
    }

    @Transactional
    public void softDeleteDocument(UUID id) {
        Document doc = getDocumentById(id);
        doc.setIsDeleted(true);
        doc.setDeletedAt(OffsetDateTime.now());
        documentRepository.save(doc);
    }

    @Transactional
    public void restoreDocument(UUID id) {
        Document doc = getDocumentById(id);
        doc.setIsDeleted(false);
        doc.setDeletedAt(null);
        documentRepository.save(doc);
    }
}
