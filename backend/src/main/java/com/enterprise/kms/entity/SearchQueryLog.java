package com.enterprise.kms.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "search_query_logs")
public class SearchQueryLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "query_text", nullable = false, length = 500)
    private String queryText;

    @Column(name = "user_id", length = 100)
    private String userId;

    @Column(name = "result_count", nullable = false)
    private Integer resultCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getQueryText() { return queryText; }
    public void setQueryText(String queryText) { this.queryText = queryText; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Integer getResultCount() { return resultCount; }
    public void setResultCount(Integer resultCount) { this.resultCount = resultCount; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
