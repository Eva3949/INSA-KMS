package com.enterprise.kms.repository;

import com.enterprise.kms.entity.StorageObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorageObjectRepository extends JpaRepository<StorageObject, UUID> {
    Optional<StorageObject> findByChecksumSha256(String checksumSha256);
}
