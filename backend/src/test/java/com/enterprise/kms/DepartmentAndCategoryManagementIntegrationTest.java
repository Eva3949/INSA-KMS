package com.enterprise.kms;

import com.enterprise.kms.controller.AdminController;
import com.enterprise.kms.controller.DepartmentController;
import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.DocumentTypeRepository;
import com.enterprise.kms.repository.FolderRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AdminCatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DepartmentAndCategoryManagementIntegrationTest {

    private DepartmentRepository departmentRepository;
    private DocumentTypeRepository documentTypeRepository;
    private DocumentRepository documentRepository;
    private UserRepository userRepository;
    private FolderRepository folderRepository;
    private AdminCatalogService adminCatalogService;
    private AdminController adminController;
    private DepartmentController departmentController;

    @BeforeEach
    void setUp() {
        departmentRepository = Mockito.mock(DepartmentRepository.class);
        documentTypeRepository = Mockito.mock(DocumentTypeRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        folderRepository = Mockito.mock(FolderRepository.class);

        adminCatalogService = new AdminCatalogService(
                departmentRepository,
                documentTypeRepository,
                null,
                documentRepository,
                folderRepository,
                userRepository,
                null,
                null,
                null
        );

        adminController = new AdminController(
                userRepository,
                documentRepository,
                departmentRepository,
                null,
                null,
                adminCatalogService,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        departmentController = new DepartmentController(departmentRepository, documentTypeRepository);
    }

    // ================= DEPARTMENT MANAGEMENT TESTS =================

    @Test
    @DisplayName("Department Management - Create Department with Quota and Active Status")
    void testCreateDepartmentSuccess() {
        Department dept = new Department();
        dept.setId(UUID.randomUUID());
        dept.setName("Information Technology");
        dept.setCode("ITSEC");
        dept.setStorageQuotaBytes(107374182400L);
        dept.setIsActive(true);

        when(departmentRepository.findByNameIgnoreCase("Information Technology")).thenReturn(Optional.empty());
        when(departmentRepository.findByCodeIgnoreCase("ITSEC")).thenReturn(Optional.empty());
        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> {
            Department arg = invocation.getArgument(0);
            arg.setId(dept.getId());
            return arg;
        });

        ResponseEntity<Map<String, Object>> response = adminController.createDepartment(Map.of(
                "name", "Information Technology",
                "code", "ITSEC",
                "storageQuotaBytes", 107374182400L
        ));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Information Technology", response.getBody().get("name"));
        assertEquals("ITSEC", response.getBody().get("code"));
        assertEquals(true, response.getBody().get("isActive"));
    }

    @Test
    @DisplayName("Department Management - Duplicate Name Prevention (409 Conflict)")
    void testCreateDepartmentDuplicateNameConflict() {
        Department existing = new Department();
        existing.setName("Finance & Accounting");
        existing.setCode("FIN");

        when(departmentRepository.findByNameIgnoreCase("Finance & Accounting")).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminController.createDepartment(Map.of("name", "Finance & Accounting", "code", "FIN2")));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already exists"));
    }

    @Test
    @DisplayName("Department Management - Duplicate Code Prevention (409 Conflict)")
    void testCreateDepartmentDuplicateCodeConflict() {
        Department existing = new Department();
        existing.setName("Finance Old");
        existing.setCode("FIN");

        when(departmentRepository.findByNameIgnoreCase("Finance New")).thenReturn(Optional.empty());
        when(departmentRepository.findByCodeIgnoreCase("FIN")).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminController.createDepartment(Map.of("name", "Finance New", "code", "FIN")));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already exists"));
    }

    @Test
    @DisplayName("Department Management - Activate and Deactivate Department")
    void testActivateAndDeactivateDepartment() {
        UUID deptId = UUID.randomUUID();
        Department dept = new Department();
        dept.setId(deptId);
        dept.setName("Human Resources");
        dept.setCode("HR");
        dept.setIsActive(true);

        when(departmentRepository.findById(deptId)).thenReturn(Optional.of(dept));
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> i.getArgument(0));

        // Deactivate
        ResponseEntity<Map<String, Object>> deactRes = adminController.deactivateDepartment(deptId);
        assertEquals(HttpStatus.OK, deactRes.getStatusCode());
        assertEquals(false, deactRes.getBody().get("isActive"));

        // Activate
        ResponseEntity<Map<String, Object>> actRes = adminController.activateDepartment(deptId);
        assertEquals(HttpStatus.OK, actRes.getStatusCode());
        assertEquals(true, actRes.getBody().get("isActive"));
    }

    @Test
    @DisplayName("Department Management - Search Departments")
    void testSearchDepartments() {
        Department d1 = new Department();
        d1.setId(UUID.randomUUID());
        d1.setName("Engineering");
        d1.setCode("ENG");
        d1.setIsActive(true);

        when(departmentRepository.findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase("eng", "eng"))
                .thenReturn(List.of(d1));
        when(documentRepository.aggregateUsageByDepartment()).thenReturn(Collections.emptyList());

        ResponseEntity<List<Map<String, Object>>> res = adminController.searchDepartments("eng");
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().size());
        assertEquals("Engineering", res.getBody().get(0).get("name"));
    }

    // ================= DOCUMENT CATEGORY / TYPE MANAGEMENT TESTS =================

    @Test
    @DisplayName("Document Category Management - Create Category with Active Status")
    void testCreateDocumentTypeSuccess() {
        DocumentType dt = new DocumentType();
        dt.setId(UUID.randomUUID());
        dt.setName("Standard Operating Procedure");
        dt.setDescription("Step by step instructions");
        dt.setIsActive(true);

        when(documentTypeRepository.findByNameIgnoreCase("Standard Operating Procedure")).thenReturn(Optional.empty());
        when(documentTypeRepository.save(any(DocumentType.class))).thenAnswer(invocation -> {
            DocumentType arg = invocation.getArgument(0);
            arg.setId(dt.getId());
            return arg;
        });

        ResponseEntity<Map<String, Object>> response = adminController.createDocumentType(Map.of(
                "name", "Standard Operating Procedure",
                "description", "Step by step instructions"
        ));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Standard Operating Procedure", response.getBody().get("name"));
        assertEquals(true, response.getBody().get("isActive"));
    }

    @Test
    @DisplayName("Document Category Management - Duplicate Name Prevention (409 Conflict)")
    void testCreateDocumentTypeDuplicateNameConflict() {
        DocumentType existing = new DocumentType();
        existing.setName("Policy");

        when(documentTypeRepository.findByNameIgnoreCase("Policy")).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminController.createDocumentType(Map.of("name", "Policy", "description", "Conflict test")));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already exists"));
    }

    @Test
    @DisplayName("Document Category Management - Activate and Deactivate Category")
    void testActivateAndDeactivateDocumentType() {
        UUID typeId = UUID.randomUUID();
        DocumentType dt = new DocumentType();
        dt.setId(typeId);
        dt.setName("Whitepaper");
        dt.setIsActive(true);

        when(documentTypeRepository.findById(typeId)).thenReturn(Optional.of(dt));
        when(documentTypeRepository.save(any(DocumentType.class))).thenAnswer(i -> i.getArgument(0));

        // Deactivate
        ResponseEntity<Map<String, Object>> deactRes = adminController.deactivateDocumentType(typeId);
        assertEquals(HttpStatus.OK, deactRes.getStatusCode());
        assertEquals(false, deactRes.getBody().get("isActive"));

        // Activate
        ResponseEntity<Map<String, Object>> actRes = adminController.activateDocumentType(typeId);
        assertEquals(HttpStatus.OK, actRes.getStatusCode());
        assertEquals(true, actRes.getBody().get("isActive"));
    }

    @Test
    @DisplayName("Document Category Management - Search Categories")
    void testSearchDocumentTypes() {
        DocumentType dt = new DocumentType();
        dt.setId(UUID.randomUUID());
        dt.setName("Security Policy");
        dt.setDescription("Guidelines");
        dt.setIsActive(true);

        when(documentTypeRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase("sec", "sec"))
                .thenReturn(List.of(dt));
        when(documentRepository.countByDocumentTypeId(any())).thenReturn(5L);

        ResponseEntity<List<Map<String, Object>>> res = adminController.searchDocumentTypes("sec");
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().size());
        assertEquals("Security Policy", res.getBody().get(0).get("name"));
    }

    // ================= ACTIVE LOOKUP ENDPOINTS FOR FILTERS =================

    @Test
    @DisplayName("Department & Category Endpoints - Active Filter Listings")
    void testGetActiveDepartmentsAndCategories() {
        Department d = new Department();
        d.setName("Legal");
        d.setIsActive(true);
        when(departmentRepository.findByIsActiveTrue()).thenReturn(List.of(d));

        DocumentType dt = new DocumentType();
        dt.setName("Contract");
        dt.setIsActive(true);
        when(documentTypeRepository.findByIsActiveTrue()).thenReturn(List.of(dt));

        ResponseEntity<List<Map<String, Object>>> deptRes = departmentController.getActiveDepartments();
        assertEquals(HttpStatus.OK, deptRes.getStatusCode());
        assertEquals(1, deptRes.getBody().size());
        assertEquals("Legal", deptRes.getBody().get(0).get("name"));

        ResponseEntity<List<Map<String, Object>>> docTypeRes = departmentController.getActiveDocumentTypes();
        assertEquals(HttpStatus.OK, docTypeRes.getStatusCode());
        assertEquals(1, docTypeRes.getBody().size());
        assertEquals("Contract", docTypeRes.getBody().get(0).get("name"));
    }

    @Test
    @DisplayName("Document Library Filter - Filter by newly created department ID")
    void testFilterDocumentsByNewDepartment() {
        UUID newDeptId = UUID.randomUUID();
        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService,
                null, null, null, null, null, null, null, null, null,
                documentRepository,
                null, null,
                searchService
        );

        Department dept = new Department();
        dept.setId(newDeptId);
        dept.setName("Artificial Intelligence Research");
        dept.setCode("AIRES");
        dept.setIsActive(true);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setTitle("AI Roadmap 2027");
        doc.setOwnerDepartment(dept);
        doc.setStatus("PUBLISHED");

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<Document> page = new org.springframework.data.domain.PageImpl<>(List.of(doc));

        when(searchService.searchDocuments(isNull(), isNull(), eq(newDeptId.toString()), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(page);
        when(documentService.toResponse(doc)).thenReturn(Map.of(
                "id", doc.getId(),
                "title", doc.getTitle(),
                "department", dept.getName(),
                "ownerDepartment", Map.of("id", newDeptId, "name", dept.getName(), "code", dept.getCode())
        ));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> response =
                docController.getAllDocuments(newDeptId.toString(), null, null, null, null, null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("AI Roadmap 2027", response.getBody().getContent().get(0).get("title"));
        assertEquals("Artificial Intelligence Research", response.getBody().getContent().get(0).get("department"));
    }

    @Test
    @DisplayName("Advanced Search Filter - Filter by newly created document category ID")
    void testFilterDocumentsByNewDocumentCategory() {
        UUID newTypeId = UUID.randomUUID();
        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.repository.SearchQueryLogRepository searchQueryLogRepository = Mockito.mock(com.enterprise.kms.repository.SearchQueryLogRepository.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);

        com.enterprise.kms.controller.SearchController searchController = new com.enterprise.kms.controller.SearchController(
                searchService,
                searchQueryLogRepository,
                documentService
        );

        DocumentType dt = new DocumentType();
        dt.setId(newTypeId);
        dt.setName("Compliance Framework");
        dt.setIsActive(true);

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setTitle("Global ISO Audit Standard");
        doc.setDocumentType(dt);
        doc.setStatus("PUBLISHED");

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<Document> page = new org.springframework.data.domain.PageImpl<>(List.of(doc));

        when(searchService.searchDocuments(isNull(), eq(newTypeId.toString()), isNull(), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(page);
        when(documentService.toResponse(doc)).thenReturn(Map.of(
                "id", doc.getId(),
                "title", doc.getTitle(),
                "documentType", dt.getName(),
                "documentTypeId", dt.getId()
        ));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> response =
                searchController.advancedSearch(
                        Map.of("docTypeId", newTypeId.toString()),
                        null, null, null, null, null, null, null, pageable
                );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Global ISO Audit Standard", response.getBody().getContent().get(0).get("title"));
        assertEquals("Compliance Framework", response.getBody().getContent().get(0).get("documentType"));
    }

    @Test
    @DisplayName("Filter Isolation - Department A only returns Doc A and excludes Doc B")
    void testDepartmentFilterIsolation() {
        UUID deptAId = UUID.randomUUID();
        UUID deptBId = UUID.randomUUID();

        Department deptA = new Department();
        deptA.setId(deptAId);
        deptA.setName("Finance");

        Department deptB = new Department();
        deptB.setId(deptBId);
        deptB.setName("Engineering");

        Document docA = new Document();
        docA.setId(UUID.randomUUID());
        docA.setTitle("Q3 Financial Report");
        docA.setOwnerDepartment(deptA);

        Document docB = new Document();
        docB.setId(UUID.randomUUID());
        docB.setTitle("Kubernetes Deployment Architecture");
        docB.setOwnerDepartment(deptB);

        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService, null, null, null, null, null, null, null, null, null,
                documentRepository, null, null, searchService
        );

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // When filtering by Dept A, only Doc A is returned
        when(searchService.searchDocuments(isNull(), isNull(), eq(deptAId.toString()), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(docA)));
        when(documentService.toResponse(docA)).thenReturn(Map.of("id", docA.getId(), "title", docA.getTitle(), "department", "Finance"));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> resA =
                docController.getAllDocuments(deptAId.toString(), null, null, null, null, null, pageable);
        assertEquals(1, resA.getBody().getTotalElements());
        assertEquals("Q3 Financial Report", resA.getBody().getContent().get(0).get("title"));

        // When filtering by Dept B, only Doc B is returned
        when(searchService.searchDocuments(isNull(), isNull(), eq(deptBId.toString()), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(docB)));
        when(documentService.toResponse(docB)).thenReturn(Map.of("id", docB.getId(), "title", docB.getTitle(), "department", "Engineering"));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> resB =
                docController.getAllDocuments(deptBId.toString(), null, null, null, null, null, pageable);
        assertEquals(1, resB.getBody().getTotalElements());
        assertEquals("Kubernetes Deployment Architecture", resB.getBody().getContent().get(0).get("title"));
    }

    @Test
    @DisplayName("Combined Filter - Department A AND Category A only returns matching documents")
    void testCombinedDepartmentAndCategoryFilter() {
        UUID deptAId = UUID.randomUUID();
        UUID catAId = UUID.randomUUID();

        Department deptA = new Department();
        deptA.setId(deptAId);
        deptA.setName("Legal");

        DocumentType catA = new DocumentType();
        catA.setId(catAId);
        catA.setName("Policy");

        Document docMatch = new Document();
        docMatch.setId(UUID.randomUUID());
        docMatch.setTitle("Data Privacy Policy 2026");
        docMatch.setOwnerDepartment(deptA);
        docMatch.setDocumentType(catA);

        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService, null, null, null, null, null, null, null, null, null,
                documentRepository, null, null, searchService
        );

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        when(searchService.searchDocuments(isNull(), eq(catAId.toString()), eq(deptAId.toString()), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(docMatch)));
        when(documentService.toResponse(docMatch)).thenReturn(Map.of(
                "id", docMatch.getId(),
                "title", docMatch.getTitle(),
                "department", "Legal",
                "documentType", "Policy"
        ));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> response =
                docController.getAllDocuments(deptAId.toString(), null, catAId.toString(), null, null, null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Data Privacy Policy 2026", response.getBody().getContent().get(0).get("title"));
        assertEquals("Legal", response.getBody().getContent().get(0).get("department"));
        assertEquals("Policy", response.getBody().getContent().get(0).get("documentType"));
    }

    @Test
    @DisplayName("Filter Isolation - Category A only returns Doc A and excludes Doc B")
    void testDocTypeFilterIsolation() {
        UUID catAId = UUID.randomUUID();
        UUID catBId = UUID.randomUUID();

        DocumentType catA = new DocumentType();
        catA.setId(catAId);
        catA.setName("Report");

        DocumentType catB = new DocumentType();
        catB.setId(catBId);
        catB.setName("Specification");

        Document docA = new Document();
        docA.setId(UUID.randomUUID());
        docA.setTitle("Annual Security Audit Report");
        docA.setDocumentType(catA);

        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService, null, null, null, null, null, null, null, null, null,
                documentRepository, null, null, searchService
        );

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        when(searchService.searchDocuments(isNull(), eq(catAId.toString()), isNull(), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(docA)));
        when(documentService.toResponse(docA)).thenReturn(Map.of("id", docA.getId(), "title", docA.getTitle(), "documentType", "Report"));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> res =
                docController.getAllDocuments(null, null, catAId.toString(), null, null, null, pageable);
        assertEquals(1, res.getBody().getTotalElements());
        assertEquals("Annual Security Audit Report", res.getBody().getContent().get(0).get("title"));
        assertEquals("Report", res.getBody().getContent().get(0).get("documentType"));
    }

    @Test
    @DisplayName("Combined Filter - Department + Category + Confidentiality (PUBLIC) returns matching document")
    void testCombinedDepartmentCategoryAndConfidentialityFilter() {
        UUID deptId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();

        Document docMatch = new Document();
        docMatch.setId(UUID.randomUUID());
        docMatch.setTitle("Public Engineering Guideline");
        docMatch.setConfidentialityLevel("PUBLIC");

        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService, null, null, null, null, null, null, null, null, null,
                documentRepository, null, null, searchService
        );

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        when(searchService.searchDocuments(isNull(), eq(catId.toString()), eq(deptId.toString()), eq("PUBLIC"), isNull(), isNull(), isNull(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(docMatch)));
        when(documentService.toResponse(docMatch)).thenReturn(Map.of(
                "id", docMatch.getId(),
                "title", docMatch.getTitle(),
                "confidentialityLevel", "PUBLIC"
        ));

        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> response =
                docController.getAllDocuments(deptId.toString(), null, catId.toString(), null, "PUBLIC", null, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Public Engineering Guideline", response.getBody().getContent().get(0).get("title"));
        assertEquals("PUBLIC", response.getBody().getContent().get(0).get("confidentialityLevel"));
    }

    @Test
    @DisplayName("SearchService - Converts String UUIDs to java.util.UUID for filteredSearch repository call")
    void testSearchServiceUUIDConversion() {
        UUID deptId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();

        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setTitle("Architecture Whitepaper");

        com.enterprise.kms.service.PermissionService permissionService = Mockito.mock(com.enterprise.kms.service.PermissionService.class);
        when(permissionService.currentCaller()).thenReturn(new com.enterprise.kms.service.PermissionService.Caller());
        when(documentRepository.filteredSearch(
                isNull(), eq(catId), eq(deptId), eq("PUBLIC"), eq(authorId), isNull(), isNull(),
                any(), any(), any(), any(), anyBoolean(), any()
        )).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(doc)));

        com.enterprise.kms.service.SearchService realSearchService =
                new com.enterprise.kms.service.SearchService(documentRepository, permissionService);

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<Document> result =
                realSearchService.searchDocuments(null, catId.toString(), deptId.toString(), "PUBLIC", authorId.toString(), null, null, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Architecture Whitepaper", result.getContent().get(0).getTitle());
    }

    @Test
    @DisplayName("Filter Reset - ALL and empty parameters trigger full active document retrieval")
    void testAllAndNullFilterHandling() {
        com.enterprise.kms.service.SearchService searchService = Mockito.mock(com.enterprise.kms.service.SearchService.class);
        com.enterprise.kms.service.DocumentService documentService = Mockito.mock(com.enterprise.kms.service.DocumentService.class);
        com.enterprise.kms.controller.DocumentController docController = new com.enterprise.kms.controller.DocumentController(
                documentService, null, null, null, null, null, null, null, null, null,
                documentRepository, null, null, searchService
        );

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        when(documentService.getAllActiveDocumentResponses(pageable))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(
                        Map.of("id", UUID.randomUUID(), "title", "Doc 1"),
                        Map.of("id", UUID.randomUUID(), "title", "Doc 2")
                )));

        // With "ALL"
        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> resAll =
                docController.getAllDocuments("ALL", null, "ALL", null, "ALL", null, pageable);
        assertEquals(2, resAll.getBody().getTotalElements());

        // With empty strings
        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> resEmpty =
                docController.getAllDocuments("", null, "", null, "", null, pageable);
        assertEquals(2, resEmpty.getBody().getTotalElements());

        // With nulls
        ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> resNull =
                docController.getAllDocuments(null, null, null, null, null, null, pageable);
        assertEquals(2, resNull.getBody().getTotalElements());

        // Verify searchService.searchDocuments was never called for unfiltered requests
        verify(searchService, never()).searchDocuments(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
