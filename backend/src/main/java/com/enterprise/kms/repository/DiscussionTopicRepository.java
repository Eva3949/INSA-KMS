package com.enterprise.kms.repository;

import com.enterprise.kms.entity.DiscussionTopic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DiscussionTopicRepository extends JpaRepository<DiscussionTopic, UUID> {

    @Query("SELECT d FROM DiscussionTopic d WHERE " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:category IS NULL OR LOWER(d.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<DiscussionTopic> searchTopics(@Param("status") String status,
                                       @Param("category") String category,
                                       @Param("search") String search,
                                       Pageable pageable);
}
