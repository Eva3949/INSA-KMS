package com.enterprise.kms.repository;

import com.enterprise.kms.entity.LegalHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LegalHoldRepository extends JpaRepository<LegalHold, UUID> {
    Optional<LegalHold> findByCaseNumber(String caseNumber);
}
