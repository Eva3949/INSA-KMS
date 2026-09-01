package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_session_attendees",
       uniqueConstraints = {@UniqueConstraint(columnNames = {"session_id", "user_id"})})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferSessionAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private KnowledgeTransferSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Boolean attended = false;

    @Column(length = 255)
    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public KnowledgeTransferSession getSession() { return session; }
    public void setSession(KnowledgeTransferSession session) { this.session = session; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Boolean getAttended() { return attended; }
    public void setAttended(Boolean attended) { this.attended = attended; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
