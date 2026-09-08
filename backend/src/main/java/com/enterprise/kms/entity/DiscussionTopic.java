package com.enterprise.kms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.HashSet;
import java.util.Set;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "discussion_topics")
public class DiscussionTopic {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private String description;

    @Column(nullable = false, length = 20)
    private String status = "OPEN"; // OPEN, CLOSED

    @Column(nullable = false, length = 20)
    private String visibility = "PUBLIC"; // PUBLIC, INTERNAL, CONFIDENTIAL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(name = "author_username", nullable = false, length = 100)
    private String authorUsername;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "discussion_allowed_departments",
        joinColumns = @JoinColumn(name = "discussion_id"),
        inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    private Set<Department> allowedDepartments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "discussion_participants",
        joinColumns = @JoinColumn(name = "discussion_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> participants = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVisibility() { return visibility != null ? visibility : "PUBLIC"; }
    public void setVisibility(String visibility) { this.visibility = visibility; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public Set<Department> getAllowedDepartments() { return allowedDepartments; }
    public void setAllowedDepartments(Set<Department> allowedDepartments) { this.allowedDepartments = allowedDepartments; }

    public Set<User> getParticipants() { return participants; }
    public void setParticipants(Set<User> participants) { this.participants = participants; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
