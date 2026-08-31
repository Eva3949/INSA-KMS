package com.enterprise.kms.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "saved_searches")
public class SavedSearch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "query_json", nullable = false, columnDefinition = "JSONB")
    private String queryJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getQueryJson() { return queryJson; }
    public void setQueryJson(String queryJson) { this.queryJson = queryJson; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    @Column(name = "alert_enabled", nullable = false)
    private Boolean alertEnabled = false;

    @Column(name = "alert_frequency", length = 20)
    private String alertFrequency = "DAILY";

    @Column(name = "last_alert_at")
    private java.time.OffsetDateTime lastAlertAt;

    public Boolean getAlertEnabled() { return alertEnabled; }
    public void setAlertEnabled(Boolean alertEnabled) { this.alertEnabled = alertEnabled; }
    public String getAlertFrequency() { return alertFrequency; }
    public void setAlertFrequency(String alertFrequency) { this.alertFrequency = alertFrequency; }
    public java.time.OffsetDateTime getLastAlertAt() { return lastAlertAt; }
    public void setLastAlertAt(java.time.OffsetDateTime lastAlertAt) { this.lastAlertAt = lastAlertAt; }
}
