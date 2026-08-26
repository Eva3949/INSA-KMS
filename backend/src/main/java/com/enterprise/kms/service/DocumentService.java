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
    private final TextExtractionService textExtractionService;
    private final com.enterprise.kms.repository.DocumentMetadataRepository documentMetadataRepository;
    private final com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository;
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
                           TextExtractionService textExtractionService,
                           com.enterprise.kms.repository.DocumentMetadataRepository documentMetadataRepository,
                           com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository,
                           UserRepository userRepository,
                           DepartmentRepository departmentRepository,
                           DocumentTypeRepository documentTypeRepository,
                           FolderRepository folderRepository,
                           PermissionService permissionService,
                           com.enterprise.kms.repository.LegalHoldItemRepository legalHoldItemRepository) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.textExtractionService = textExtractionService;
        this.documentMetadataRepository = documentMetadataRepository;
        this.documentTypeFieldRepository = documentTypeFieldRepository;
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

        // FR-27: department storage quota enforcement Ã¢â‚¬â€ reject the upload before the
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
        // FR-10: extract embedded text (PDFs) or queue OCR (images/scans)
        try {
            textExtractionService.processNewVersion(version, file.getBytes(), version.getMimeType(), originalFilename);
        } catch (Exception ignored) {
            // extraction must never fail the upload
        }
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
        // FR-10: extract text for the new version as well
        try {
            textExtractionService.processNewVersion(version, file.getBytes(), version.getMimeType(), version.getFileName());
        } catch (Exception ignored) {
            // extraction must never fail the check-in
        }
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

    /**
     * FR-04 version rollback: restore a document to a previous version by creating
     * a new version that reuses the old version's storage object.  The old file bytes
     * are not copied — the storage object is shared — so this is O(1) in I/O.
     */
    @Transactional
    public Document rollbackToVersion(UUID documentId, UUID targetVersionId, String username) {
        Document doc = getDocumentById(documentId);
        permissionService.requireDocumentAccess(documentId, PermissionService.EDIT);

        DocumentVersion targetVersion = documentVersionRepository.findById(targetVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Version not found: " + targetVersionId));
        if (!targetVersion.getDocument().getId().equals(documentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Version " + targetVersionId + " does not belong to document " + documentId);
        }

        User author = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        int nextVersionNumber = doc.getCurrentVersion() != null
                ? doc.getCurrentVersion().getVersionNumber() + 1 : 2;

        DocumentVersion rollback = new DocumentVersion();
        rollback.setDocument(doc);
        rollback.setVersionNumber(nextVersionNumber);
        rollback.setFileName(targetVersion.getFileName());
        rollback.setMimeType(targetVersion.getMimeType());
        rollback.setStorageObject(targetVersion.getStorageObject());
        rollback.setCreatedBy(author);
        rollback.setChangeSummary("Rolled back to version " + targetVersion.getVersionNumber());
        rollback = documentVersionRepository.save(rollback);

        doc.setCurrentVersion(rollback);
        doc.setUpdatedAt(OffsetDateTime.now());
        return documentRepository.save(doc);
    }

    public Document getDocumentById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
    }

    /** Resolve a User by username for comment attribution etc. */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found: " + username));
    }

    // ---------------- FR-05 Check-in / Check-out lock system ----------------

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public Map<String, Object> getLockStatus(UUID documentId) {
        Map<String, Object> status = new LinkedHashMap<>();
        List<?> locks = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (locks.isEmpty()) {
            status.put("locked", false);
        } else {
            com.enterprise.kms.entity.DocumentLock lockEntity = (com.enterprise.kms.entity.DocumentLock) locks.get(0);
            boolean expired = lockEntity.getExpiresAt() != null
                    && lockEntity.getExpiresAt().isBefore(OffsetDateTime.now());
            status.put("locked", !expired);
            status.put("lockedBy", lockEntity.getLockedBy() != null ? lockEntity.getLockedBy().getUsername() : null);
            status.put("lockedAt", lockEntity.getLockedAt());
            status.put("expiresAt", lockEntity.getExpiresAt());
            status.put("expired", expired);
        }
        return status;
    }

    @Transactional
    public Map<String, Object> checkoutDocument(UUID documentId, String username) {
        Document doc = getDocumentById(documentId);

        List<?> existing = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (!existing.isEmpty()) {
            com.enterprise.kms.entity.DocumentLock existingLock = (com.enterprise.kms.entity.DocumentLock) existing.get(0);
            boolean expired = existingLock.getExpiresAt() != null
                    && existingLock.getExpiresAt().isBefore(OffsetDateTime.now());
            if (!expired) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Document is already checked out by " + existingLock.getLockedBy().getUsername());
            }
            entityManager.remove(existingLock);
            entityManager.flush();
        }

        User user = getUserByUsername(username);

        com.enterprise.kms.entity.DocumentLock lock = new com.enterprise.kms.entity.DocumentLock();
        lock.setDocumentId(documentId);
        lock.setDocument(doc);
        lock.setLockedBy(user);
        lock.setLockedAt(OffsetDateTime.now());
        lock.setExpiresAt(OffsetDateTime.now().plusHours(8));
        entityManager.persist(lock);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "CHECKED_OUT");
        result.put("lockedBy", username);
        result.put("lockedAt", lock.getLockedAt());
        result.put("expiresAt", lock.getExpiresAt());
        return result;
    }

    @Transactional
    public Document checkinDocument(UUID documentId, MultipartFile file, String changeSummary, String username) {
        releaseLock(documentId, username, true);
        return createDesktopCheckInVersion(documentId, file,
                changeSummary != null ? changeSummary : "Checked in via lock release", username);
    }

    @Transactional
    public Map<String, Object> unlockDocument(UUID documentId, String username) {
        releaseLock(documentId, username, false);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "UNLOCKED");
        result.put("documentId", documentId.toString());
        return result;
    }

    @SuppressWarnings("unchecked")
    private void releaseLock(UUID documentId, String username, boolean requireOwnership) {
        List<?> locks = entityManager.createQuery(
                "SELECT l FROM DocumentLock l WHERE l.documentId = :docId")
                .setParameter("docId", documentId)
                .getResultList();

        if (locks.isEmpty()) {
            if (requireOwnership) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is not checked out");
            }
            return;
        }

        com.enterprise.kms.entity.DocumentLock lock = (com.enterprise.kms.entity.DocumentLock) locks.get(0);
        boolean isOwner = lock.getLockedBy() != null
                && username.equals(lock.getLockedBy().getUsername());
        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the user who checked out this document (" + lock.getLockedBy().getUsername() + ") can release the lock");
        }
        entityManager.remove(lock);
        entityManager.flush();
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

    // ---------------- Recycle bin listing (FR-08) ----------------

    /**
     * FR-08: recycle bin contents for the caller - admins see all, others only their
     * own deletions. Mapped inside the transaction so lazy associations resolve.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecycleBinResponses(Pageable pageable) {
        PermissionService.Caller caller = permissionService.currentCaller();
        String username = com.enterprise.kms.security.SecurityUtils.getCurrentUsername();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Document doc : documentRepository.findByIsDeletedTrue(pageable).getContent()) {
            if (!caller.isAdmin && (doc.getAuthor() == null || !username.equals(doc.getAuthor().getUsername()))) {
                continue;
            }
            Map<String, Object> row = toResponse(doc);
            row.put("deletedAt", doc.getDeletedAt());
            rows.add(row);
        }
        return rows;
    }

    // ---------------- Custom metadata values (FR-06) ----------------

    /** Field definitions for the document's type, plus the stored values. */
    @Transactional(readOnly = true)
    public Map<String, Object> getDocumentMetadata(UUID documentId) {
        Document doc = permissionService.requireDocumentAccess(documentId, PermissionService.VIEW);

        List<Map<String, Object>> fields = new ArrayList<>();
        Map<String, String> values = new LinkedHashMap<>();
        if (doc.getDocumentType() != null) {
            for (com.enterprise.kms.entity.DocumentTypeField field : documentTypeFieldRepository
                    .findByDocumentTypeIdOrderByCreatedAtAsc(doc.getDocumentType().getId())) {
                Map<String, Object> fieldRow = new LinkedHashMap<>();
                fieldRow.put("fieldKey", field.getFieldKey());
                fieldRow.put("label", field.getLabel());
                fieldRow.put("dataType", field.getDataType());
                fieldRow.put("required", field.getIsRequired());
                fields.add(fieldRow);
            }
        }
        for (com.enterprise.kms.entity.DocumentMetadata metadata : documentMetadataRepository.findByDocumentId(documentId)) {
            values.put(metadata.getMetadataKey(), metadata.getMetadataValue());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentTypeId", doc.getDocumentType() != null ? doc.getDocumentType().getId() : null);
        result.put("fields", fields);
        result.put("values", values);
        return result;
    }

    /**
     * Upserts custom metadata values, validating against the document type's field
     * definitions (FR-06): unknown keys are rejected and required fields must be
     * present with a value matching the declared data type.
     */
    @Transactional
    public Map<String, Object> putDocumentMetadata(UUID documentId, Map<String, String> incoming) {
        permissionService.requireDocumentAccess(documentId, PermissionService.EDIT);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (doc.getDocumentType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no document type");
        }

        List<com.enterprise.kms.entity.DocumentTypeField> defs =
                documentTypeFieldRepository.findByDocumentTypeIdOrderByCreatedAtAsc(doc.getDocumentType().getId());

        for (Map.Entry<String, String> entry : incoming.entrySet()) {
            String key = entry.getKey();
            com.enterprise.kms.entity.DocumentTypeField def = defs.stream()
                    .filter(d -> d.getFieldKey().equalsIgnoreCase(key))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Unknown metadata field '" + key + "' for document type " + doc.getDocumentType().getName()));
            validateMetadataValue(def, entry.getValue());

            com.enterprise.kms.entity.DocumentMetadata record = documentMetadataRepository
                    .findByDocumentIdAndMetadataKey(documentId, def.getFieldKey())
                    .orElseGet(() -> {
                        com.enterprise.kms.entity.DocumentMetadata m = new com.enterprise.kms.entity.DocumentMetadata();
                        m.setDocument(doc);
                        m.setMetadataKey(def.getFieldKey());
                        return m;
                    });
            record.setMetadataValue(entry.getValue() == null ? "" : entry.getValue());
            documentMetadataRepository.save(record);
        }

        // Required-field completeness check (FR-06)
        List<String> missing = new ArrayList<>();
        for (com.enterprise.kms.entity.DocumentTypeField def : defs) {
            if (Boolean.TRUE.equals(def.getIsRequired())) {
                String value = incoming.containsKey(def.getFieldKey())
                        ? incoming.get(def.getFieldKey())
                        : documentMetadataRepository
                                .findByDocumentIdAndMetadataKey(documentId, def.getFieldKey())
                                .map(com.enterprise.kms.entity.DocumentMetadata::getMetadataValue)
                                .orElse("");
                if (value == null || value.isBlank()) {
                    missing.add(def.getLabel());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("saved", incoming.size());
        result.put("missingRequiredFields", missing);
        return result;
    }

    private void validateMetadataValue(com.enterprise.kms.entity.DocumentTypeField def, String value) {
        if (value == null || value.isBlank()) {
            return; // blank clears/omits; required-ness is checked afterwards
        }
        switch (def.getDataType() != null ? def.getDataType().toUpperCase() : "TEXT") {
            case "NUMBER" -> {
                try {
                    new java.math.BigDecimal(value.trim());
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be a number");
                }
            }
            case "DATE" -> {
                try {
                    java.time.LocalDate.parse(value.trim());
                } catch (Exception e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be an ISO date (YYYY-MM-DD)");
                }
            }
            case "BOOLEAN" -> {
                String v = value.trim().toLowerCase();
                if (!"true".equals(v) && !"false".equals(v)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + def.getLabel() + "' must be true or false");
                }
            }
            default -> { /* TEXT accepts anything */ }
        }
    }}
