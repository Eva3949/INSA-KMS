package com.enterprise.kms.repository;

import com.enterprise.kms.entity.SearchQueryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SearchQueryLogRepository extends JpaRepository<SearchQueryLog, UUID> {

    @Query(value = "SELECT query_text, COUNT(*) AS hit_count, MAX(created_at) AS last_searched " +
                   "FROM search_query_logs WHERE created_at >= :since " +
                   "GROUP BY query_text ORDER BY hit_count DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findTopSearches(@Param("since") OffsetDateTime since, @Param("limit") int limit);
}
