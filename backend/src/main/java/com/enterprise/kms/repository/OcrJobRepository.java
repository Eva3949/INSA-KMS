package com.enterprise.kms.repository;

import com.enterprise.kms.entity.OcrJob;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OcrJobRepository extends JpaRepository<OcrJob, UUID> {
    long countByStatus(String status);
    List<OcrJob> findByOrderByCreatedAtDesc(Pageable pageable);
    List<OcrJob> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);
}
