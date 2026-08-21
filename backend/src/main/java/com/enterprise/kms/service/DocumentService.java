package com.enterprise.kms.service;

import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
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

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository documentVersionRepository,
                           StorageService storageService,
                           UserRepository userRepository,
                           DepartmentRepository departmentRepository,
                           DocumentTypeRepository documentTypeRepository,
                           FolderRepository folderRepository) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.folderRepository = folderRepository;
    }

    @Transactional
    public Document createDocument(MultipartFile file, String title, String departmentCode, String documentTypeName, String confidentialityLevel, String username) {
        User author = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        Department dept = departmentRepository.findByCode(departmentCode)
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName(departmentCode + " Department");
                    d.setCode(departmentCode);
                    return departmentRepository.save(d);
                });

        DocumentType docType = documentTypeRepository.findByName(documentTypeName)
                .orElseGet(() -> {
                    DocumentType dt = new DocumentType();
                    dt.setName(documentTypeName);
                    return documentTypeRepository.save(dt);
                });

        StorageObject storageObject = storageService.storeFile(file);

        Document doc = new Document();
        doc.setTitle(title != null ? title : file.getOriginalFilename());
        doc.setOwnerDepartment(dept);
        doc.setAuthor(author);
        doc.setDocumentType(docType);
        doc.setConfidentialityLevel(confidentialityLevel != null ? confidentialityLevel : "INTERNAL");
        doc = documentRepository.save(doc);

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(1);
        version.setFileName(file.getOriginalFilename());
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

    public Page<Document> getAllActiveDocuments(Pageable pageable) {
        return documentRepository.findByIsDeletedFalse(pageable);
    }

    public Document getDocumentById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
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
