package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    Optional<Department> findByCode(String code);
    Optional<Department> findByName(String name);
    Optional<Department> findByNameIgnoreCase(String name);
    Optional<Department> findByCodeIgnoreCase(String code);
    @org.springframework.data.jpa.repository.Query("SELECT d FROM Department d WHERE d.isActive = true OR d.isActive IS NULL ORDER BY d.name ASC")
    java.util.List<Department> findByIsActiveTrue();

    java.util.List<Department> findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(String name, String code);
}
