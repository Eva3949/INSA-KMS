package com.enterprise.kms.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class CreateVideoSessionRequest {
    private String title;
    private String description;
    private OffsetDateTime scheduledStart;
    private OffsetDateTime scheduledEnd;
    private Integer durationMinutes;
    private List<UUID> participantUserIds;
    private List<String> invitedUsernames;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(OffsetDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public OffsetDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(OffsetDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public List<UUID> getParticipantUserIds() { return participantUserIds; }
    public void setParticipantUserIds(List<UUID> participantUserIds) { this.participantUserIds = participantUserIds; }

    public List<String> getInvitedUsernames() { return invitedUsernames; }
    public void setInvitedUsernames(List<String> invitedUsernames) { this.invitedUsernames = invitedUsernames; }
}
