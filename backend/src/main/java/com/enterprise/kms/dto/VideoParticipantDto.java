package com.enterprise.kms.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class VideoParticipantDto {
    private UUID id;
    private UUID userId;
    private String username;
    private String fullName;
    private String role; // HOST, MODERATOR, PARTICIPANT
    private String status; // INVITED, JOINED, LEFT, DECLINED
    private OffsetDateTime joinedAt;
    private OffsetDateTime leftAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }

    public OffsetDateTime getLeftAt() { return leftAt; }
    public void setLeftAt(OffsetDateTime leftAt) { this.leftAt = leftAt; }
}
