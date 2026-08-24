package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findByParentIdAndIsDeletedFalse(UUID parentId);
    List<Folder> findByDepartmentIdAndIsDeletedFalse(UUID departmentId);
    List<Folder> findByIsDeletedFalseOrderByNameAsc();
}
