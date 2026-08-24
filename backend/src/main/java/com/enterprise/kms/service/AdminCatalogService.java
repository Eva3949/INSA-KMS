package com.enterprise.kms.service;

import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.entity.Tag;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.DocumentTypeRepository;
import com.enterprise.kms.repository.FolderRepository;
import com.enterprise.kms.repository.TagRepository;
import com.enterprise.kms.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminCatalogService {
    private final DepartmentRepository departmentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final TagRepository tagRepository;
    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public AdminCatalogService(DepartmentRepository departmentRepository,
                               DocumentTypeRepository documentTypeRepository,
                               TagRepository tagRepository,
                               DocumentRepository documentRepository,
                               FolderRepository folderRepository,
                               UserRepository userRepository) {
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.tagRepository = tagRepository;
        this.documentRepository = documentRepository;
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
    }

    // ---------- Departments (FR-27 storage quotas) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDepartmentsWithUsage() {
        Map<UUID, Object[]> usageByDept = new HashMap<>();
        for (Object[] row : documentRepository.aggregateUsageByDepartment()) {
            UUID deptId = UUID.fromString(row[0].toString());
            usageByDept.put(deptId, row);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Department dept : departmentRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", dept.getId());
            row.put("name", dept.getName());
            row.put("code", dept.getCode());
            row.put("storageQuotaBytes", dept.getStorageQuotaBytes());

            Object[] usage = usageByDept.get(dept.getId());
            long usedBytes = usage != null ? ((Number) usage[1]).longValue() : 0L;
            long documentCount = usage != null ? ((Number) usage[2]).longValue() : 0L;
            row.put("usedBytes", usedBytes);
            row.put("documentCount", documentCount);
            row.put("userCount", userRepository.countByDepartmentId(dept.getId()));
            double quota = dept.getStorageQuotaBytes() != null && dept.getStorageQuotaBytes() > 0
                    ? dept.getStorageQuotaBytes() : 1.0;
            row.put("usagePercent", Math.min(100.0, Math.round((usedBytes / quota) * 1000.0) / 10.0));
            result.add(row);
        }
        return result;
    }

    @Transactional
    public Department createDepartment(String name, String code, Long storageQuotaBytes) {
        if (name == null || name.isBlank() || code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department name and code are required");
        }
        if (departmentRepository.findByName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this name already exists");
        }
        if (departmentRepository.findByCode(code).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this code already exists");
        }
        Department dept = new Department();
        dept.setName(name.trim());
        dept.setCode(code.trim().toUpperCase());
        if (storageQuotaBytes != null && storageQuotaBytes > 0) {
            dept.setStorageQuotaBytes(storageQuotaBytes);
        }
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department updateDepartment(UUID id, String name, String code, Long storageQuotaBytes) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        if (name != null && !name.isBlank()) {
            dept.setName(name.trim());
        }
        if (code != null && !code.isBlank()) {
            dept.setCode(code.trim().toUpperCase());
        }
        if (storageQuotaBytes != null && storageQuotaBytes > 0) {
            dept.setStorageQuotaBytes(storageQuotaBytes);
        }
        return departmentRepository.save(dept);
    }

    @Transactional
    public void deleteDepartment(UUID id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        if (userRepository.countByDepartmentId(id) > 0
                || !documentRepository.findByOwnerDepartmentIdAndIsDeletedFalse(id).isEmpty()
                || !folderRepository.findByDepartmentIdAndIsDeletedFalse(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Department still contains users, documents or folders and cannot be deleted");
        }
        departmentRepository.delete(dept);
    }

    // ---------- Document types (Section 9 metadata schema) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDocumentTypesWithUsage() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (DocumentType type : documentTypeRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", type.getId());
            row.put("name", type.getName());
            row.put("description", type.getDescription());
            row.put("documentCount", documentRepository.countByDocumentTypeId(type.getId()));
            row.put("createdAt", type.getCreatedAt());
            result.add(row);
        }
        return result;
    }

    @Transactional
    public DocumentType createDocumentType(String name, String description) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document type name is required");
        }
        if (documentTypeRepository.findByName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A document type with this name already exists");
        }
        DocumentType type = new DocumentType();
        type.setName(name.trim());
        type.setDescription(description);
        return documentTypeRepository.save(type);
    }

    @Transactional
    public DocumentType updateDocumentType(UUID id, String name, String description) {
        DocumentType type = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        if (name != null && !name.isBlank()) {
            type.setName(name.trim());
        }
        if (description != null) {
            type.setDescription(description);
        }
        return documentTypeRepository.save(type);
    }

    @Transactional
    public void deleteDocumentType(UUID id) {
        DocumentType type = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        if (documentRepository.countByDocumentTypeId(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Document type is in use by existing documents and cannot be deleted");
        }
        documentTypeRepository.delete(type);
    }

    // ---------- Taxonomy / Tags (FR-03, FR-06) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTagsWithUsage() {
        Map<UUID, Long> usageByTag = new HashMap<>();
        for (Object[] row : tagRepository.countUsagePerTag()) {
            UUID tagId = UUID.fromString(row[0].toString());
            Number count = (Number) row[1];
            usageByTag.put(tagId, count.longValue());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Tag tag : tagRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", tag.getId());
            row.put("name", tag.getName());
            row.put("category", tag.getCategory());
            row.put("documentCount", usageByTag.getOrDefault(tag.getId(), 0L));
            row.put("createdAt", tag.getCreatedAt());
            result.add(row);
        }
        return result;
    }

    @Transactional
    public Tag createTag(String name, String category) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tag name is required");
        }
        if (tagRepository.findByName(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A tag with this name already exists");
        }
        Tag tag = new Tag();
        tag.setName(name.trim());
        tag.setCategory(category != null && !category.isBlank() ? category.trim() : "General");
        return tagRepository.save(tag);
    }

    @Transactional
    public Tag updateTag(UUID id, String name, String category) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found"));
        if (name != null && !name.isBlank()) {
            tag.setName(name.trim());
        }
        if (category != null && !category.isBlank()) {
            tag.setCategory(category.trim());
        }
        return tagRepository.save(tag);
    }

    @Transactional
    public void deleteTag(UUID id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found"));
        entityManager.createNativeQuery("DELETE FROM document_tags WHERE tag_id = :tagId")
                .setParameter("tagId", id)
                .executeUpdate();
        tagRepository.delete(tag);
    }

    // ---------- Groups (FR-27 user groups, Keycloak-synced) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGroupsWithMembership() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT g.id, g.name, COALESCE(dep.name, '-') AS department, " +
                        "(SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count " +
                        "FROM groups g LEFT JOIN departments dep ON g.department_id = dep.id ORDER BY g.name")
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", r[0].toString());
            row.put("name", r[1]);
            row.put("department", r[2]);
            row.put("memberCount", ((Number) r[3]).longValue());
            result.add(row);
        }
        return result;
    }

    public static long toLong(Object value) {
        return value instanceof BigInteger ? ((BigInteger) value).longValue()
                : value instanceof Number ? ((Number) value).longValue() : 0L;
    }
}
