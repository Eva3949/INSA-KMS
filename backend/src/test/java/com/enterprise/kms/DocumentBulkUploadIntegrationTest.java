package com.enterprise.kms;

import com.enterprise.kms.controller.DocumentController;
import com.enterprise.kms.dto.BulkUploadItemResult;
import com.enterprise.kms.dto.BulkUploadResult;
import com.enterprise.kms.entity.*;
import com.enterprise.kms.repository.*;
import com.enterprise.kms.service.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class DocumentBulkUploadIntegrationTest {

    private DocumentRepository documentRepository;
    private DocumentVersionRepository documentVersionRepository;
    private StorageService storageService;
    private TextExtractionService textExtractionService;
    private DocumentMetadataRepository documentMetadataRepository;
    private DocumentTypeFieldRepository documentTypeFieldRepository;
    private UserRepository userRepository;
    private DepartmentRepository departmentRepository;
    private DocumentTypeRepository documentTypeRepository;
    private FolderRepository folderRepository;
    private PermissionService permissionService;
    private LegalHoldItemRepository legalHoldItemRepository;
    private ApprovalService approvalService;
    private NotificationService notificationService;
    private DocumentService documentService;
    private DocumentController documentController;

    private User testUser;
    private Department testDept;
    private DocumentType testDocType;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        documentVersionRepository = mock(DocumentVersionRepository.class);
        storageService = mock(StorageService.class);
        textExtractionService = mock(TextExtractionService.class);
        documentMetadataRepository = mock(DocumentMetadataRepository.class);
        documentTypeFieldRepository = mock(DocumentTypeFieldRepository.class);
        userRepository = mock(UserRepository.class);
        departmentRepository = mock(DepartmentRepository.class);
        documentTypeRepository = mock(DocumentTypeRepository.class);
        folderRepository = mock(FolderRepository.class);
        permissionService = mock(PermissionService.class);
        legalHoldItemRepository = mock(LegalHoldItemRepository.class);
        approvalService = mock(ApprovalService.class);
        notificationService = mock(NotificationService.class);

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setEmail("testuser@enterprise.internal");

        testDept = new Department();
        testDept.setId(UUID.randomUUID());
        testDept.setName("Engineering Department");
        testDept.setCode("ENG");

        testDocType = new DocumentType();
        testDocType.setId(UUID.randomUUID());
        testDocType.setName("Policy");

        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(departmentRepository.findByCode(anyString())).thenReturn(Optional.of(testDept));
        when(departmentRepository.findByName(anyString())).thenReturn(Optional.of(testDept));
        when(documentTypeRepository.findByName(anyString())).thenReturn(Optional.of(testDocType));

        StorageObject mockStorageObject = new StorageObject();
        mockStorageObject.setId(UUID.randomUUID());
        mockStorageObject.setStoragePath("test-storage-path.pdf");
        mockStorageObject.setChecksumSha256("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        when(storageService.storeFile(any())).thenReturn(mockStorageObject);

        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document doc = invocation.getArgument(0);
            if (doc.getId() == null) {
                doc.setId(UUID.randomUUID());
            }
            return doc;
        });

        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(invocation -> {
            DocumentVersion v = invocation.getArgument(0);
            if (v.getId() == null) {
                v.setId(UUID.randomUUID());
            }
            return v;
        });

        documentService = new DocumentService(
                documentRepository,
                documentVersionRepository,
                storageService,
                textExtractionService,
                documentMetadataRepository,
                documentTypeFieldRepository,
                userRepository,
                departmentRepository,
                documentTypeRepository,
                folderRepository,
                permissionService,
                legalHoldItemRepository,
                approvalService
        );

        documentController = new DocumentController(
                documentService,
                permissionService,
                null,
                null,
                null,
                null,
                userRepository,
                null,
                null,
                null,
                documentRepository,
                storageService,
                null,
                null,
                notificationService
        );
    }

    @Test
    @DisplayName("Bulk Upload: Multiple Valid Files Succeed")
    public void testBulkUploadMultipleValidFiles() {
        MockMultipartFile file1 = new MockMultipartFile("files", "policy1.pdf", "application/pdf", "Content 1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("files", "procedure2.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content 2".getBytes());
        MockMultipartFile file3 = new MockMultipartFile("files", "dataset3.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content 3".getBytes());

        List<MultipartFile> files = List.of(file1, file2, file3);
        List<String> titles = List.of("Security Policy 2026", "Operating Procedure", "Dataset Q1");

        BulkUploadResult result = documentService.bulkUploadDocuments(
                files, titles, "ENG", "Policy", "INTERNAL", null, null, notificationService, "testuser"
        );

        Assertions.assertNotNull(result);
        Assertions.assertEquals(3, result.getTotalFiles());
        Assertions.assertEquals(3, result.getSuccessfulCount());
        Assertions.assertEquals(0, result.getFailedCount());
        Assertions.assertEquals("Security Policy 2026", result.getItems().get(0).getTitle());
        Assertions.assertEquals("Operating Procedure", result.getItems().get(1).getTitle());
        Assertions.assertEquals("Dataset Q1", result.getItems().get(2).getTitle());
        Assertions.assertTrue(result.getItems().get(0).isSuccess());
        Assertions.assertTrue(result.getItems().get(1).isSuccess());
        Assertions.assertTrue(result.getItems().get(2).isSuccess());
        Assertions.assertNotNull(result.getItems().get(0).getDocumentId());

        verify(notificationService, times(3)).sendNotification(eq("testuser"), anyString(), anyString(), any(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Bulk Upload: Partial Success with Mixed Valid and Disallowed Executable")
    public void testBulkUploadPartialSuccessMixedFiles() {
        MockMultipartFile validPdf = new MockMultipartFile("files", "valid_report.pdf", "application/pdf", "Valid PDF Content".getBytes());
        MockMultipartFile maliciousExe = new MockMultipartFile("files", "trojan.exe", "application/octet-stream", "MZ binary payload".getBytes());
        MockMultipartFile validDoc = new MockMultipartFile("files", "readme.txt", "text/plain", "Text content".getBytes());

        List<MultipartFile> files = List.of(validPdf, maliciousExe, validDoc);
        List<String> titles = List.of("Valid Report", "Executable File", "Readme Text");

        BulkUploadResult result = documentService.bulkUploadDocuments(
                files, titles, "ENG", "Policy", "INTERNAL", null, null, notificationService, "testuser"
        );

        Assertions.assertNotNull(result);
        Assertions.assertEquals(3, result.getTotalFiles());
        Assertions.assertEquals(2, result.getSuccessfulCount());
        Assertions.assertEquals(1, result.getFailedCount());

        Assertions.assertTrue(result.getItems().get(0).isSuccess());
        Assertions.assertFalse(result.getItems().get(1).isSuccess());
        Assertions.assertTrue(result.getItems().get(1).getMessage().contains("disallowed for security reasons"));
        Assertions.assertTrue(result.getItems().get(2).isSuccess());
    }

    @Test
    @DisplayName("Bulk Upload: Empty File Handling")
    public void testBulkUploadEmptyFileHandling() {
        MockMultipartFile emptyFile = new MockMultipartFile("files", "empty.pdf", "application/pdf", new byte[0]);
        MockMultipartFile validFile = new MockMultipartFile("files", "valid.pdf", "application/pdf", "Valid".getBytes());

        BulkUploadResult result = documentService.bulkUploadDocuments(
                List.of(emptyFile, validFile), null, "ENG", "Policy", "INTERNAL", null, null, notificationService, "testuser"
        );

        Assertions.assertEquals(2, result.getTotalFiles());
        Assertions.assertEquals(1, result.getSuccessfulCount());
        Assertions.assertEquals(1, result.getFailedCount());
        Assertions.assertFalse(result.getItems().get(0).isSuccess());
        Assertions.assertTrue(result.getItems().get(0).getMessage().contains("empty"));
        Assertions.assertTrue(result.getItems().get(1).isSuccess());
    }

    @Test
    @DisplayName("Bulk Upload: Department Quota Exceeded Enforcement")
    public void testBulkUploadDepartmentQuotaEnforcement() {
        Department quotaDept = new Department();
        quotaDept.setId(UUID.randomUUID());
        quotaDept.setName("Finance Department");
        quotaDept.setCode("FIN");
        quotaDept.setStorageQuotaBytes(100L); // Tiny quota of 100 bytes

        when(departmentRepository.findByCode("FIN")).thenReturn(Optional.of(quotaDept));
        when(documentRepository.sumStoredBytesByDepartment(quotaDept.getId())).thenReturn(90L);

        MockMultipartFile hugeFile = new MockMultipartFile("files", "big.pdf", "application/pdf", new byte[50]); // 90 + 50 > 100

        BulkUploadResult result = documentService.bulkUploadDocuments(
                List.of(hugeFile), null, "FIN", "Policy", "INTERNAL", null, null, notificationService, "testuser"
        );

        Assertions.assertEquals(1, result.getTotalFiles());
        Assertions.assertEquals(0, result.getSuccessfulCount());
        Assertions.assertEquals(1, result.getFailedCount());
        Assertions.assertTrue(result.getItems().get(0).getMessage().contains("quota"));
    }

    @Test
    @DisplayName("Bulk Upload: Custom Metadata Persistence")
    public void testBulkUploadCustomMetadataPersistence() {
        DocumentTypeField field = new DocumentTypeField();
        field.setId(UUID.randomUUID());
        field.setFieldKey("projectCode");
        field.setLabel("Project Code");
        field.setDataType("TEXT");
        field.setIsRequired(false);

        when(documentTypeFieldRepository.findByDocumentTypeIdOrderByCreatedAtAsc(testDocType.getId()))
                .thenReturn(List.of(field));

        MockMultipartFile file = new MockMultipartFile("files", "project_doc.pdf", "application/pdf", "Data".getBytes());
        Map<String, String> customMetadata = Map.of("projectCode", "PRJ-9001");

        BulkUploadResult result = documentService.bulkUploadDocuments(
                List.of(file), null, "ENG", "Policy", "INTERNAL", customMetadata, null, notificationService, "testuser"
        );

        Assertions.assertEquals(1, result.getSuccessfulCount());
        verify(documentMetadataRepository, atLeastOnce()).save(any(DocumentMetadata.class));
    }

    @Test
    @DisplayName("Bulk Upload: Controller Level Endpoint Delegation")
    public void testControllerBulkUploadEndpoint() {
        MockMultipartFile file1 = new MockMultipartFile("files", "doc1.pdf", "application/pdf", "content 1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("files", "doc2.pdf", "application/pdf", "content 2".getBytes());

        Map<String, String> allParams = new HashMap<>();
        allParams.put("departmentCode", "ENG");
        allParams.put("documentTypeName", "Policy");
        allParams.put("confidentialityLevel", "CONFIDENTIAL");
        allParams.put("metadata.projectCode", "ALPHA");

        ResponseEntity<BulkUploadResult> response = documentController.bulkUpload(
                List.of(file1, file2),
                List.of("Title 1", "Title 2"),
                "ENG",
                "Policy",
                "CONFIDENTIAL",
                List.of("Tag1", "Tag2"),
                allParams
        );

        Assertions.assertNotNull(response);
        Assertions.assertEquals(200, response.getStatusCode().value());
        Assertions.assertEquals(2, response.getBody().getTotalFiles());
        Assertions.assertEquals(2, response.getBody().getSuccessfulCount());
    }

    @Test
    @DisplayName("Regression: Single Document Upload Continues Working Flawlessly")
    public void testSingleDocumentUploadRegression() {
        MockMultipartFile singleFile = new MockMultipartFile("file", "single_doc.pdf", "application/pdf", "Single upload content".getBytes());

        Document createdDoc = documentService.createDocument(
                singleFile, "Single Document Title", "ENG", "Policy", "INTERNAL", "testuser"
        );

        Assertions.assertNotNull(createdDoc);
        Assertions.assertEquals("Single Document Title", createdDoc.getTitle());
        Assertions.assertEquals("INTERNAL", createdDoc.getConfidentialityLevel());
        Assertions.assertNotNull(createdDoc.getCurrentVersion());
        Assertions.assertEquals("single_doc.pdf", createdDoc.getCurrentVersion().getFileName());
        verify(approvalService, times(1)).autoSubmitNewDocument(eq(createdDoc), eq("testuser"));
    }
}
