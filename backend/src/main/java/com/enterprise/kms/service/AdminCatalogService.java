package com.enterprise.kms.service;

import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.entity.Tag;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.DocumentTypeRepository;
import com.enterprise.kms.repository.FolderRepository;
import com.enterprise.kms.repository.GroupRepository;
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
import java.util.Optional;
import java.util.UUID;

@Service
public class AdminCatalogService {
    private final DepartmentRepository departmentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final TagRepository tagRepository;
    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository;
    private final com.enterprise.kms.service.StorageService storageService;

    @PersistenceContext
    private EntityManager entityManager;

    public AdminCatalogService(DepartmentRepository departmentRepository,
                               DocumentTypeRepository documentTypeRepository,
                               TagRepository tagRepository,
                               DocumentRepository documentRepository,
                               FolderRepository folderRepository,
                               UserRepository userRepository,
                           GroupRepository groupRepository,
                           com.enterprise.kms.repository.DocumentTypeFieldRepository documentTypeFieldRepository,
                           com.enterprise.kms.service.StorageService storageService) {
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.tagRepository = tagRepository;
        this.documentRepository = documentRepository;
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.documentTypeFieldRepository = documentTypeFieldRepository;
        this.storageService = storageService;
    }

    // ---------- Departments (FR-27 storage quotas & lifecycle) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDepartmentsWithUsage() {
        return mapDepartmentsWithUsage(departmentRepository.findAll());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchDepartments(String query) {
        if (query == null || query.isBlank()) {
            return getDepartmentsWithUsage();
        }
        String trimmed = query.trim();
        List<Department> matched = departmentRepository
                .findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(trimmed, trimmed);
        return mapDepartmentsWithUsage(matched);
    }

    private List<Map<String, Object>> mapDepartmentsWithUsage(List<Department> departments) {
        Map<UUID, Object[]> usageByDept = new HashMap<>();
        for (Object[] row : documentRepository.aggregateUsageByDepartment()) {
            UUID deptId = UUID.fromString(row[0].toString());
            usageByDept.put(deptId, row);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Department dept : departments) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", dept.getId());
            row.put("name", dept.getName());
            row.put("code", dept.getCode());
            row.put("storageQuotaBytes", dept.getStorageQuotaBytes());
            row.put("isActive", dept.getIsActive() != null ? dept.getIsActive() : true);
            row.put("createdAt", dept.getCreatedAt());

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
        String trimmedName = name.trim();
        String trimmedCode = code.trim().toUpperCase();
        if (trimmedName.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department name must not exceed 100 characters");
        }
        if (trimmedCode.length() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department code must not exceed 20 characters");
        }
        if (departmentRepository.findByNameIgnoreCase(trimmedName).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this name already exists");
        }
        if (departmentRepository.findByCodeIgnoreCase(trimmedCode).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this code already exists");
        }
        Department dept = new Department();
        dept.setName(trimmedName);
        dept.setCode(trimmedCode);
        dept.setIsActive(true);
        if (storageQuotaBytes != null && storageQuotaBytes > 0) {
            dept.setStorageQuotaBytes(storageQuotaBytes);
        }
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department updateDepartment(UUID id, String name, String code, Long storageQuotaBytes) {
        return updateDepartment(id, name, code, storageQuotaBytes, null);
    }

    @Transactional
    public Department updateDepartment(UUID id, String name, String code, Long storageQuotaBytes, Boolean isActive) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        if (name != null && !name.isBlank()) {
            String trimmedName = name.trim();
            if (trimmedName.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department name must not exceed 100 characters");
            }
            Optional<Department> existingName = departmentRepository.findByNameIgnoreCase(trimmedName);
            if (existingName.isPresent() && !existingName.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this name already exists");
            }
            dept.setName(trimmedName);
        }
        if (code != null && !code.isBlank()) {
            String trimmedCode = code.trim().toUpperCase();
            if (trimmedCode.length() > 20) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department code must not exceed 20 characters");
            }
            Optional<Department> existingCode = departmentRepository.findByCodeIgnoreCase(trimmedCode);
            if (existingCode.isPresent() && !existingCode.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A department with this code already exists");
            }
            dept.setCode(trimmedCode);
        }
        if (storageQuotaBytes != null && storageQuotaBytes > 0) {
            dept.setStorageQuotaBytes(storageQuotaBytes);
        }
        if (isActive != null) {
            dept.setIsActive(isActive);
        }
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department activateDepartment(UUID id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        dept.setIsActive(true);
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department deactivateDepartment(UUID id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        dept.setIsActive(false);
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

    // ---------- Document types & Categories (Section 9 metadata schema & lifecycle) ----------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDocumentTypesWithUsage() {
        return mapDocumentTypesWithUsage(documentTypeRepository.findAll());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchDocumentTypes(String query) {
        if (query == null || query.isBlank()) {
            return getDocumentTypesWithUsage();
        }
        String trimmed = query.trim();
        List<DocumentType> matched = documentTypeRepository
                .findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(trimmed, trimmed);
        return mapDocumentTypesWithUsage(matched);
    }

    private List<Map<String, Object>> mapDocumentTypesWithUsage(List<DocumentType> types) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (DocumentType type : types) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", type.getId());
            row.put("name", type.getName());
            row.put("description", type.getDescription());
            row.put("isActive", type.getIsActive() != null ? type.getIsActive() : true);
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
        String trimmedName = name.trim();
        if (trimmedName.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document type name must not exceed 100 characters");
        }
        if (documentTypeRepository.findByNameIgnoreCase(trimmedName).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A document type with this name already exists");
        }
        DocumentType type = new DocumentType();
        type.setName(trimmedName);
        type.setDescription(description != null ? description.trim() : null);
        type.setIsActive(true);
        return documentTypeRepository.save(type);
    }

    @Transactional
    public DocumentType updateDocumentType(UUID id, String name, String description) {
        return updateDocumentType(id, name, description, null);
    }

    @Transactional
    public DocumentType updateDocumentType(UUID id, String name, String description, Boolean isActive) {
        DocumentType type = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        if (name != null && !name.isBlank()) {
            String trimmedName = name.trim();
            if (trimmedName.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document type name must not exceed 100 characters");
            }
            Optional<DocumentType> existing = documentTypeRepository.findByNameIgnoreCase(trimmedName);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A document type with this name already exists");
            }
            type.setName(trimmedName);
        }
        if (description != null) {
            type.setDescription(description.trim());
        }
        if (isActive != null) {
            type.setIsActive(isActive);
        }
        return documentTypeRepository.save(type);
    }

    @Transactional
    public DocumentType activateDocumentType(UUID id) {
        DocumentType type = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        type.setIsActive(true);
        return documentTypeRepository.save(type);
    }

    @Transactional
    public DocumentType deactivateDocumentType(UUID id) {
        DocumentType type = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
        type.setIsActive(false);
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

    // ---------- Groups management (FR-27) ----------

    @Transactional
    public Map<String, Object> createGroup(String name, UUID departmentId) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group name is required");
        }
        if (groupRepository.findByName(name.trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A group with this name already exists");
        }
        com.enterprise.kms.entity.Group group = new com.enterprise.kms.entity.Group();
        group.setName(name.trim());
        if (departmentId != null) {
            Department dept = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            group.setDepartment(dept);
        }
        groupRepository.save(group);
        return getGroupDetail(group.getId());
    }

    @Transactional
    public Map<String, Object> updateGroup(UUID groupId, String name, UUID departmentId) {
        com.enterprise.kms.entity.Group group = requireGroup(groupId);
        if (name != null && !name.isBlank()) {
            if (!group.getName().equals(name.trim()) && groupRepository.findByName(name.trim()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A group with this name already exists");
            }
            group.setName(name.trim());
        }
        if (departmentId != null) {
            Department dept = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            group.setDepartment(dept);
        }
        groupRepository.save(group);
        return getGroupDetail(groupId);
    }

    @Transactional
    public void deleteGroup(UUID groupId) {
        requireGroup(groupId);
        entityManager.createNativeQuery("DELETE FROM user_groups WHERE group_id = :gid")
                .setParameter("gid", groupId)
                .executeUpdate();
        entityManager.createNativeQuery("DELETE FROM folder_permissions WHERE subject_type = 'GROUP' AND subject_id = :sid")
                .setParameter("sid", groupId.toString())
                .executeUpdate();
        entityManager.createNativeQuery("DELETE FROM document_permissions WHERE subject_type = 'GROUP' AND subject_id = :sid")
                .setParameter("sid", groupId.toString())
                .executeUpdate();
        groupRepository.deleteById(groupId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMembers(UUID groupId) {
        requireGroup(groupId);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT u.id, u.username, u.email, u.is_active, u.role_name " +
                        "FROM users u JOIN user_groups ug ON ug.user_id = u.id " +
                        "WHERE ug.group_id = :gid ORDER BY u.username")
                .setParameter("gid", groupId)
                .getResultList();
        List<Map<String, Object>> members = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", r[0].toString());
            row.put("username", r[1]);
            row.put("email", r[2]);
            row.put("active", ((Number) r[3]).intValue() == 1);
            row.put("roleName", r[4] != null ? r[4].toString() : null);
            members.add(row);
        }
        return members;
    }

    @Transactional
    public void addMember(UUID groupId, UUID userId) {
        requireGroup(groupId);
        userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Number existing = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM user_groups WHERE user_id = :uid AND group_id = :gid")
                .setParameter("uid", userId)
                .setParameter("gid", groupId)
                .getSingleResult();
        if (existing.longValue() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of this group");
        }
        entityManager.createNativeQuery("INSERT INTO user_groups (user_id, group_id) VALUES (:uid, :gid)")
                .setParameter("uid", userId)
                .setParameter("gid", groupId)
                .executeUpdate();
    }

    @Transactional
    public void removeMember(UUID groupId, UUID userId) {
        requireGroup(groupId);
        int updated = entityManager.createNativeQuery(
                        "DELETE FROM user_groups WHERE user_id = :uid AND group_id = :gid")
                .setParameter("uid", userId)
                .setParameter("gid", groupId)
                .executeUpdate();
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User is not a member of this group");
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGroupDetail(UUID groupId) {
        com.enterprise.kms.entity.Group group = requireGroup(groupId);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", group.getId());
        row.put("name", group.getName());
        row.put("department", group.getDepartment() != null ? group.getDepartment().getName() : "-");
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM user_groups WHERE group_id = :gid")
                .setParameter("gid", groupId)
                .getSingleResult();
        row.put("memberCount", count.longValue());
        return row;
    }

    private com.enterprise.kms.entity.Group requireGroup(UUID groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    // ---------- Custom metadata field definitions (FR-06 schema builder) ----------

    @Transactional(readOnly = true)
    public List<com.enterprise.kms.entity.DocumentTypeField> listTypeFields(UUID documentTypeId) {
        requireDocType(documentTypeId);
        return documentTypeFieldRepository.findByDocumentTypeIdOrderByCreatedAtAsc(documentTypeId);
    }

    @Transactional
    public Map<String, Object> createTypeField(UUID documentTypeId, String fieldKey, String label,
                                               String dataType, boolean required) {
        com.enterprise.kms.entity.DocumentType type = requireDocType(documentTypeId);
        if (fieldKey == null || fieldKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fieldKey is required");
        }
        String key = fieldKey.trim();
        if (!key.matches("[a-zA-Z0-9_\\-]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "fieldKey may only contain letters, digits, underscores and hyphens");
        }
        String dtype = dataType != null ? dataType.toUpperCase() : "TEXT";
        if (!List.of("TEXT", "NUMBER", "DATE", "BOOLEAN").contains(dtype)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dataType must be TEXT, NUMBER, DATE or BOOLEAN");
        }
        if (documentTypeFieldRepository.existsByDocumentTypeIdAndFieldKey(documentTypeId, key)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This field already exists for the document type");
        }
        com.enterprise.kms.entity.DocumentTypeField field = new com.enterprise.kms.entity.DocumentTypeField();
        field.setDocumentType(type);
        field.setFieldKey(key);
        field.setLabel(label != null && !label.isBlank() ? label.trim() : key);
        field.setDataType(dtype);
        field.setIsRequired(required);
        field = documentTypeFieldRepository.save(field);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", field.getId());
        row.put("fieldKey", field.getFieldKey());
        row.put("label", field.getLabel());
        row.put("dataType", field.getDataType());
        row.put("required", field.getIsRequired());
        return row;
    }

    @Transactional
    public Map<String, Object> updateTypeField(UUID fieldId, String label, String dataType, Boolean required) {
        com.enterprise.kms.entity.DocumentTypeField field = documentTypeFieldRepository.findById(fieldId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Field not found"));
        if (label != null && !label.isBlank()) {
            field.setLabel(label.trim());
        }
        if (dataType != null && !dataType.isBlank()) {
            String dtype = dataType.toUpperCase();
            if (!List.of("TEXT", "NUMBER", "DATE", "BOOLEAN").contains(dtype)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dataType must be TEXT, NUMBER, DATE or BOOLEAN");
            }
            field.setDataType(dtype);
        }
        if (required != null) {
            field.setIsRequired(required);
        }
        field = documentTypeFieldRepository.save(field);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", field.getId());
        row.put("fieldKey", field.getFieldKey());
        row.put("label", field.getLabel());
        row.put("dataType", field.getDataType());
        row.put("required", field.getIsRequired());
        return row;
    }

    @Transactional
    public void deleteTypeField(UUID fieldId) {
        if (!documentTypeFieldRepository.existsById(fieldId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Field not found");
        }
        documentTypeFieldRepository.deleteById(fieldId);
    }

    private com.enterprise.kms.entity.DocumentType requireDocType(UUID id) {
        return documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document type not found"));
    }

    // ---------- Backup & durability status (NFR-06) ----------

    @Transactional(readOnly = true)
    public Map<String, Object> getEncryptionStatus() {
        return storageService.getEncryptionStatus();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBackupStatus(com.enterprise.kms.service.SystemSettingService settings) {
        Map<String, Object> row = new LinkedHashMap<>();
        List<Object[]> dbInfo = entityManager.createNativeQuery(
                "SELECT current_database(), pg_size_pretty(pg_database_size(current_database())), " +
                "pg_database_size(current_database())")
                .getResultList();
        if (!dbInfo.isEmpty()) {
            Object[] info = (Object[]) dbInfo.get(0);
            row.put("databaseName", info[0]);
            row.put("databaseSizePretty", info[1]);
            row.put("databaseSizeBytes", ((Number) info[2]).longValue());
        }
        row.put("documentCount", documentRepository.count());
        row.put("lastBackupAt", settings.getSettingValue("backup.last-run-at", ""));
        row.put("backupLocation", settings.getSettingValue("backup.location", "./backups"));
        row.put("backupScript", "scripts/backup-database.ps1");
        return row;
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
