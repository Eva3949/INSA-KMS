package com.enterprise.kms.repository;

import com.enterprise.kms.entity.UserGroup;
import com.enterprise.kms.entity.UserGroupId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserGroupRepository extends JpaRepository<UserGroup, UserGroupId> {
    List<UserGroup> findById_GroupId(UUID groupId);
    boolean existsById_UserIdAndId_GroupId(UUID userId, UUID groupId);
}
