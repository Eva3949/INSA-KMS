package com.enterprise.kms.repository;

import com.enterprise.kms.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    Optional<Tag> findByName(String name);

    @Query(value = "SELECT tag_id, COUNT(*) AS usage_count FROM document_tags GROUP BY tag_id", nativeQuery = true)
    List<Object[]> countUsagePerTag();
}
