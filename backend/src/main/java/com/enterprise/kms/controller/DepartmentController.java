package com.enterprise.kms.controller;

import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.DocumentType;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final DocumentTypeRepository documentTypeRepository;

    public DepartmentController(DepartmentRepository departmentRepository,
                                DocumentTypeRepository documentTypeRepository) {
        this.departmentRepository = departmentRepository;
        this.documentTypeRepository = documentTypeRepository;
    }

    /**
     * Returns all active departments for dropdowns, filters, and uploads across the application.
     */
    @GetMapping("/departments/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getActiveDepartments() {
        List<Map<String, Object>> list = departmentRepository.findByIsActiveTrue().stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            m.put("code", d.getCode());
            m.put("storageQuotaBytes", d.getStorageQuotaBytes());
            m.put("isActive", d.getIsActive());
            m.put("createdAt", d.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    /**
     * Returns all active document types / categories for dropdowns, filters, and uploads across the application.
     */
    @GetMapping("/document-types/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getActiveDocumentTypes() {
        List<Map<String, Object>> list = documentTypeRepository.findByIsActiveTrue().stream().map(dt -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", dt.getId());
            m.put("name", dt.getName());
            m.put("description", dt.getDescription());
            m.put("isActive", dt.getIsActive());
            m.put("createdAt", dt.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }
}
