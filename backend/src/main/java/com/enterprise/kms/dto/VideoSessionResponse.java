package com.enterprise.kms.dto;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class VideoSessionResponse {
    private UUID id;
    private UUID discussionId;
    private String discussionTitle;
    private UUID hostUserId;
    private String hostUsername;
    private String hostFullName;
    private String title;
    private String description;
    private OffsetDateTime scheduledStart;
    private OffsetDateTime scheduledEnd;
    private String status; // SCHEDULED, ACTIVE, ENDED, CANCELLED
    private String meetingProvider;
    private String meetingIdentifier;
    private String meetingUrl;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private boolean isHost;
    private boolean canJoin;
    private List<VideoParticipantDto> participants = new ArrayList<>();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getDiscussionId() { return discussionId; }
    public void setDiscussionId(UUID discussionId) { this.discussionId = discussionId; }

    public String getDiscussionTitle() { return discussionTitle; }
    public void setDiscussionTitle(String discussionTitle) { this.discussionTitle = discussionTitle; }

    public UUID getHostUserId() { return hostUserId; }
    public void setHostUserId(UUID hostUserId) { this.hostUserId = hostUserId; }

    public String getHostUsername() { return hostUsername; }
    public void setHostUsername(String hostUsername) { this.hostUsername = hostUsername; }

    public String getHostFullName() { return hostFullName; }
    public void setHostFullName(String hostFullName) { this.hostFullName = hostFullName; }

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

    public boolean isHost() { return isHost; }
    public void setHost(boolean host) { isHost = host; }

    public boolean isCanJoin() { return canJoin; }
    public void setCanJoin(boolean canJoin) { this.canJoin = canJoin; }

    public List<VideoParticipantDto> getParticipants() { return participants; }
    public void setParticipants(List<VideoParticipantDto> participants) { this.participants = participants; }
}
