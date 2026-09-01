package com.enterprise.kms.service;

import com.enterprise.kms.entity.Department;
import com.enterprise.kms.entity.KnowledgeTransferCase;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.KnowledgeTransferCaseRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@Service
public class HrEmployeeService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final KnowledgeTransferCaseRepository caseRepository;
    private final DocumentService documentService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public HrEmployeeService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            KnowledgeTransferCaseRepository caseRepository,
            DocumentService documentService,
            AuditService auditService,
            NotificationService notificationService) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.caseRepository = caseRepository;
        this.documentService = documentService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listEmployees(
            String query, UUID deptId, String status, UUID managerId, Pageable pageable) {
        String effQuery = (query != null && !query.isBlank()) ? query.trim().toLowerCase() : null;
        String effStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) ? status.trim().toUpperCase() : null;

        org.springframework.data.jpa.domain.Specification<User> spec = (root, q, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (deptId != null) {
                predicates.add(cb.equal(root.get("department").get("id"), deptId));
            }
            if (effStatus != null) {
                predicates.add(cb.equal(root.get("employmentStatus"), effStatus));
            }
            if (managerId != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), managerId));
            }
            if (effQuery != null) {
                String pattern = "%" + effQuery + "%";
                jakarta.persistence.criteria.Predicate usernameMatch = cb.like(cb.lower(root.get("username")), pattern);
                jakarta.persistence.criteria.Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                jakarta.persistence.criteria.Predicate fullNameMatch = cb.and(
                        cb.isNotNull(root.get("fullName")),
                        cb.like(cb.lower(root.get("fullName")), pattern)
                );
                jakarta.persistence.criteria.Predicate jobTitleMatch = cb.and(
                        cb.isNotNull(root.get("jobTitle")),
                        cb.like(cb.lower(root.get("jobTitle")), pattern)
                );
                predicates.add(cb.or(usernameMatch, emailMatch, fullNameMatch, jobTitleMatch));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return userRepository.findAll(spec, pageable).map(this::employeeToResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeProfile(UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        return employeeToResponse(u);
    }

    @Transactional
    public Map<String, Object> updateEmployeeHrInfo(UUID userId, Map<String, Object> payload, String updaterUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));

        if (payload.containsKey("fullName")) {
            user.setFullName((String) payload.get("fullName"));
        }
        if (payload.containsKey("phone")) {
            user.setPhone((String) payload.get("phone"));
        }
        if (payload.containsKey("jobTitle")) {
            user.setJobTitle((String) payload.get("jobTitle"));
        }
        if (payload.containsKey("employmentStatus") && payload.get("employmentStatus") != null) {
            String status = ((String) payload.get("employmentStatus")).trim().toUpperCase();
            user.setEmploymentStatus(status);
        }
        if (payload.containsKey("employeeNumber")) {
            user.setEmployeeNumber((String) payload.get("employeeNumber"));
        }
        if (payload.containsKey("hireDate") && payload.get("hireDate") != null) {
            try {
                user.setHireDate(LocalDate.parse(((String) payload.get("hireDate")).trim()));
            } catch (Exception ignored) {}
        }
        if (payload.containsKey("departmentId")) {
            String deptIdStr = (String) payload.get("departmentId");
            if (deptIdStr != null && !deptIdStr.isBlank()) {
                Department dept = departmentRepository.findById(UUID.fromString(deptIdStr.trim()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found"));
                user.setDepartment(dept);
            } else {
                user.setDepartment(null);
            }
        }
        if (payload.containsKey("managerId")) {
            String mgrIdStr = (String) payload.get("managerId");
            if (mgrIdStr != null && !mgrIdStr.isBlank()) {
                User manager = userRepository.findById(UUID.fromString(mgrIdStr.trim()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager not found"));
                user.setManager(manager);
            } else {
                user.setManager(null);
            }
        }

        User saved = userRepository.save(user);

        auditService.recordAuditLog(
                updaterUsername, null, "HR_EMPLOYEE_UPDATED", "USER",
                userId.toString(), null, "Updated HR details for employee: " + saved.getUsername()
        );

        return employeeToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeKnowledgeAndTransfers(UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));

        List<KnowledgeTransferCase> outgoingTransfers = caseRepository.findByEmployeeIdAndIsDeletedFalse(userId);
        List<KnowledgeTransferCase> incomingTransfers = caseRepository.findBySuccessorIdAndIsDeletedFalse(userId);

        List<Map<String, Object>> outgoingList = outgoingTransfers.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("status", c.getStatus());
            m.put("priority", c.getPriority());
            m.put("reasonType", c.getReasonType());
            m.put("successor", c.getSuccessor() != null ? c.getSuccessor().getUsername() : null);
            m.put("clearanceStatus", c.getClearanceStatus());
            return m;
        }).toList();

        List<Map<String, Object>> incomingList = incomingTransfers.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("status", c.getStatus());
            m.put("priority", c.getPriority());
            m.put("reasonType", c.getReasonType());
            m.put("employee", c.getEmployee() != null ? c.getEmployee().getUsername() : null);
            m.put("clearanceStatus", c.getClearanceStatus());
            return m;
        }).toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("employee", employeeToResponse(u));
        res.put("outgoingTransfers", outgoingList);
        res.put("incomingTransfers", incomingList);
        return res;
    }

    public Map<String, Object> employeeToResponse(User u) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("username", u.getUsername());
        row.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
        row.put("email", u.getEmail());
        row.put("phone", u.getPhone() != null ? u.getPhone() : "");
        row.put("jobTitle", u.getJobTitle() != null ? u.getJobTitle() : "");
        row.put("employmentStatus", u.getEmploymentStatus() != null ? u.getEmploymentStatus() : "ACTIVE");
        row.put("employeeNumber", u.getEmployeeNumber() != null ? u.getEmployeeNumber() : "");
        row.put("hireDate", u.getHireDate());
        row.put("roleName", u.getRoleName());
        row.put("isActive", Boolean.TRUE.equals(u.getIsActive()));
        row.put("createdAt", u.getCreatedAt());

        if (u.getDepartment() != null) {
            Map<String, Object> dMap = new LinkedHashMap<>();
            dMap.put("id", u.getDepartment().getId());
            dMap.put("name", u.getDepartment().getName());
            dMap.put("code", u.getDepartment().getCode() != null ? u.getDepartment().getCode() : "");
            row.put("department", dMap);
            row.put("departmentId", u.getDepartment().getId());
        } else {
            row.put("department", null);
            row.put("departmentId", null);
        }

        if (u.getManager() != null) {
            Map<String, Object> mgrMap = new LinkedHashMap<>();
            mgrMap.put("id", u.getManager().getId());
            mgrMap.put("username", u.getManager().getUsername());
            mgrMap.put("fullName", u.getManager().getFullName() != null ? u.getManager().getFullName() : u.getManager().getUsername());
            mgrMap.put("email", u.getManager().getEmail());
            row.put("manager", mgrMap);
            row.put("managerId", u.getManager().getId());
        } else {
            row.put("manager", null);
            row.put("managerId", null);
        }

        return row;
    }
}
