package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);
    List<Subscription> findByTargetTypeAndTargetId(String targetType, UUID targetId);
    List<Subscription> findByUserId(UUID userId);
    void deleteByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);
}
