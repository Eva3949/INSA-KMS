package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "video_sessions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VideoSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discussion_id", nullable = false)
    private DiscussionTopic discussion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_user_id")
    private User hostUser;

    @Column(name = "host_username", nullable = false, length = 100)
    private String hostUsername;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private String description;

    @Column(name = "scheduled_start", nullable = false)
    private OffsetDateTime scheduledStart = OffsetDateTime.now();

    @Column(name = "scheduled_end")
    private OffsetDateTime scheduledEnd;

    @Column(nullable = false, length = 30)
    private String status = "SCHEDULED"; // SCHEDULED, ACTIVE, ENDED, CANCELLED

    @Column(name = "meeting_provider", nullable = false, length = 50)
    private String meetingProvider = "JITSI";

    @Column(name = "meeting_identifier", nullable = false, length = 500)
    private String meetingIdentifier;

    @Column(name = "meeting_url", length = 500)
    private String meetingUrl;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "videoSession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VideoSessionParticipant> participants = new ArrayList<>();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public DiscussionTopic getDiscussion() { return discussion; }
    public void setDiscussion(DiscussionTopic discussion) { this.discussion = discussion; }

    public User getHostUser() { return hostUser; }
    public void setHostUser(User hostUser) { this.hostUser = hostUser; }

    public String getHostUsername() { return hostUsername; }
    public void setHostUsername(String hostUsername) { this.hostUsername = hostUsername; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(OffsetDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public OffsetDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(OffsetDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMeetingProvider() { return meetingProvider; }
    public void setMeetingProvider(String meetingProvider) { this.meetingProvider = meetingProvider; }

    public String getMeetingIdentifier() { return meetingIdentifier; }
    public void setMeetingIdentifier(String meetingIdentifier) { this.meetingIdentifier = meetingIdentifier; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }

    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<VideoSessionParticipant> getParticipants() { return participants; }
    public void setParticipants(List<VideoSessionParticipant> participants) { this.participants = participants; }
}
