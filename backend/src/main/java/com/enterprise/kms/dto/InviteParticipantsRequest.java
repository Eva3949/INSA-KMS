package com.enterprise.kms.dto;

import java.util.List;
import java.util.UUID;

public class InviteParticipantsRequest {
    private List<UUID> participantUserIds;
    private List<String> usernames;

    public List<UUID> getParticipantUserIds() { return participantUserIds; }
    public void setParticipantUserIds(List<UUID> participantUserIds) { this.participantUserIds = participantUserIds; }

    public List<String> getUsernames() { return usernames; }
    public void setUsernames(List<String> usernames) { this.usernames = usernames; }
}
