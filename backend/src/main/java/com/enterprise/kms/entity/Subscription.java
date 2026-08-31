package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "target_type", "target_id"})
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "notify_versions", nullable = false)
    private Boolean notifyVersions = true;

    @Column(name = "notify_comments", nullable = false)
    private Boolean notifyComments = true;

    @Column(name = "notify_shares", nullable = false)
    private Boolean notifyShares = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public UUID getTargetId() { return targetId; }
    public void setTargetId(UUID targetId) { this.targetId = targetId; }
    public Boolean getNotifyVersions() { return notifyVersions; }
    public void setNotifyVersions(Boolean notifyVersions) { this.notifyVersions = notifyVersions; }
    public Boolean getNotifyComments() { return notifyComments; }
    public void setNotifyComments(Boolean notifyComments) { this.notifyComments = notifyComments; }
    public Boolean getNotifyShares() { return notifyShares; }
    public void setNotifyShares(Boolean notifyShares) { this.notifyShares = notifyShares; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
