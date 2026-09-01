package com.enterprise.kms.repository;

import com.enterprise.kms.entity.KnowledgeTransferCase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeTransferCaseRepository extends JpaRepository<KnowledgeTransferCase, UUID> {

    Optional<KnowledgeTransferCase> findByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT c FROM KnowledgeTransferCase c WHERE c.isDeleted = false " +
           "AND (:employeeId IS NULL OR c.employee.id = :employeeId) " +
           "AND (:managerId IS NULL OR c.manager.id = :managerId) " +
           "AND (:successorId IS NULL OR c.successor.id = :successorId) " +
           "AND (:deptId IS NULL OR c.department.id = :deptId) " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:search IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.employee.username) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.employee.fullName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<KnowledgeTransferCase> findFiltered(
            @Param("employeeId") UUID employeeId,
            @Param("managerId") UUID managerId,
            @Param("successorId") UUID successorId,
            @Param("deptId") UUID deptId,
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);

    List<KnowledgeTransferCase> findByEmployeeIdAndIsDeletedFalse(UUID employeeId);
    List<KnowledgeTransferCase> findBySuccessorIdAndIsDeletedFalse(UUID successorId);
    List<KnowledgeTransferCase> findByManagerIdAndIsDeletedFalse(UUID managerId);
}
