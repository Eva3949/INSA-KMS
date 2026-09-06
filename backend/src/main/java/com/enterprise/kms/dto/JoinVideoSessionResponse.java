package com.enterprise.kms.dto;

import java.util.UUID;

public class JoinVideoSessionResponse {
    private UUID sessionId;
    private UUID discussionId;
    private String discussionTitle;
    private String title;
    private String meetingProvider; // JITSI
    private String meetingIdentifier;
    private String meetingDomain; // e.g. meet.jit.si
    private String meetingUrl;
    private String userDisplayName;
    private String userEmail;
    private String participantRole; // HOST, PARTICIPANT
    private boolean isHost;
    private String jwtToken;

    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }

    public UUID getDiscussionId() { return discussionId; }
    public void setDiscussionId(UUID discussionId) { this.discussionId = discussionId; }

    public String getDiscussionTitle() { return discussionTitle; }
    public void setDiscussionTitle(String discussionTitle) { this.discussionTitle = discussionTitle; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMeetingProvider() { return meetingProvider; }
    public void setMeetingProvider(String meetingProvider) { this.meetingProvider = meetingProvider; }

    public String getMeetingIdentifier() { return meetingIdentifier; }
    public void setMeetingIdentifier(String meetingIdentifier) { this.meetingIdentifier = meetingIdentifier; }

    public String getMeetingDomain() { return meetingDomain; }
    public void setMeetingDomain(String meetingDomain) { this.meetingDomain = meetingDomain; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public String getUserDisplayName() { return userDisplayName; }
    public void setUserDisplayName(String userDisplayName) { this.userDisplayName = userDisplayName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getParticipantRole() { return participantRole; }
    public void setParticipantRole(String participantRole) { this.participantRole = participantRole; }

    public boolean isHost() { return isHost; }
    public void setHost(boolean host) { isHost = host; }

    public String getJwtToken() { return jwtToken; }
    public void setJwtToken(String jwtToken) { this.jwtToken = jwtToken; }
}
