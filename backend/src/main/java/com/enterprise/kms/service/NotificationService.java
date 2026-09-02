package com.enterprise.kms.service;

import com.enterprise.kms.entity.Notification;
import com.enterprise.kms.entity.NotificationEventType;
import com.enterprise.kms.entity.Subscription;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.NotificationRepository;
import com.enterprise.kms.repository.SubscriptionRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-26 notifications: per-user in-app notification feed, with optional email
 * delivery via EmailService. Caller services trigger notifications when document,
 * approval, knowledge transfer, HR, or security events occur.
 */
@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               SubscriptionRepository subscriptionRepository,
                               EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Page<Map<String, Object>> listNotifications(UUID userId, boolean unreadOnly, Pageable pageable) {
        if (userId != null && notificationRepository.countByUserId(userId) == 0) {
            seedDefaultNotificationsForUser(userId);
        }

        Page<Notification> page = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return page.map(this::toMap);
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(UUID notificationId, UUID userId) {
        Notification n = notificationRepository.findById(notificationId).orElse(null);
        if (n != null && n.getUser().getId().equals(userId) && !Boolean.TRUE.equals(n.getIsRead())) {
            n.setIsRead(true);
            n.setReadAt(OffsetDateTime.now());
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead(UUID userId) {
        for (Notification n : notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, Pageable.unpaged()).getContent()) {
            n.setIsRead(true);
            n.setReadAt(OffsetDateTime.now());
            notificationRepository.save(n);
        }
    }

    /** Create an in-app notification for username with event metadata and deep link. */
    @Transactional
    public void sendNotification(String username, String title, String message, String eventType, String targetType, UUID targetId, String actionUrl) {
        if (username == null || username.isBlank()) return;
        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);
        if (user != null) {
            sendNotificationToUser(user, title, message, eventType, targetType, targetId, actionUrl);
        }
    }

    /** Create an in-app notification for username (backward-compatible overload). */
    @Transactional
    public void sendNotification(String username, String title, String message) {
        sendNotification(username, title, message, NotificationEventType.SYSTEM, null, null, null);
    }

    /** Create an in-app notification for a User entity with full metadata and safe deduplication. */
    @Transactional
    public void sendNotificationToUser(User user, String title, String message, String eventType, String targetType, UUID targetId, String actionUrl) {
        if (user == null || user.getId() == null) return;

        // Safe deduplication: avoid duplicate unread notifications for same event & target within last 2 minutes
        if (eventType != null && targetId != null) {
            OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(2);
            if (notificationRepository.existsByUserIdAndEventTypeAndTargetIdAndIsReadFalseAndCreatedAtAfter(
                    user.getId(), eventType, targetId, cutoff)) {
                log.debug("Skipping duplicate unread notification for user={}, event={}, target={}", user.getUsername(), eventType, targetId);
                return;
            }
        }

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title != null ? title : "KMS Notification");
        n.setMessage(message != null ? message : "");
        n.setEventType(eventType != null ? eventType : NotificationEventType.SYSTEM);
        n.setTargetType(targetType);
        n.setTargetId(targetId);
        n.setActionUrl(actionUrl);
        n.setIsRead(false);
        notificationRepository.save(n);

        // Safe email dispatch: SMTP failure must never rollback in-app notification persistence
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            try {
                emailService.notify(user.getEmail(), title, message);
            } catch (Exception e) {
                log.warn("Email notification dispatch failed for user {}: {}", user.getUsername(), e.getMessage());
            }
        }
    }

    /** Create an in-app notification for a User entity (backward-compatible overload). */
    @Transactional
    public void sendNotificationToUser(User user, String title, String message) {
        sendNotificationToUser(user, title, message, NotificationEventType.SYSTEM, null, null, null);
    }

    /** Broadcast notification to all users matching a role with full metadata. */
    @Transactional
    public void sendNotificationToRole(String roleName, String title, String message, String eventType, String targetType, UUID targetId, String actionUrl) {
        List<User> users = userRepository.findByRoleName(roleName);
        for (User u : users) {
            sendNotificationToUser(u, title, message, eventType, targetType, targetId, actionUrl);
        }
    }

    /** Broadcast notification to all users matching a role (backward-compatible overload). */
    @Transactional
    public void sendNotificationToRole(String roleName, String title, String message) {
        sendNotificationToRole(roleName, title, message, NotificationEventType.SYSTEM, null, null, null);
    }

    /** Notify subscribers of targetType + targetId according to preference type with deep link. */
    @Transactional
    public void notifySubscribers(String targetType, UUID targetId, String eventType, String title, String message, String actionUrl) {
        List<Subscription> subs = subscriptionRepository.findByTargetTypeAndTargetId(targetType, targetId);
        for (Subscription sub : subs) {
            boolean allow = switch (eventType.toUpperCase()) {
                case "VERSION", "DOCUMENT_VERSION_CREATED" -> Boolean.TRUE.equals(sub.getNotifyVersions());
                case "COMMENT", "DOCUMENT_COMMENT_ADDED" -> Boolean.TRUE.equals(sub.getNotifyComments());
                case "SHARE", "DOCUMENT_SHARED" -> Boolean.TRUE.equals(sub.getNotifyShares());
                default -> true;
            };
            if (allow && sub.getUser() != null) {
                sendNotificationToUser(sub.getUser(), title, message, eventType, targetType, targetId, actionUrl);
            }
        }
    }

    /** Notify subscribers of targetType + targetId (backward-compatible overload). */
    @Transactional
    public void notifySubscribers(String targetType, UUID targetId, String eventType, String title, String message) {
        notifySubscribers(targetType, targetId, eventType, title, message, null);
    }

    private void seedDefaultNotificationsForUser(UUID userId) {
        User u = userRepository.findById(userId).orElse(null);
        if (u == null) return;

        String role = u.getRoleName() != null ? u.getRoleName() : "ROLE_VIEWER";

        sendNotificationToUser(u, "Welcome to INSA Knowledge Management System",
                "Your account (" + u.getUsername() + ") is active with role " + role + ". You can search, browse, and manage organizational documents.",
                NotificationEventType.SYSTEM, "USER", u.getId(), "/library");

        if ("ROLE_ADMIN".equals(role)) {
            sendNotificationToUser(u, "System Administrator Control Center",
                    "You have administrative privileges to manage users, storage quotas, retention policies, and security monitoring.",
                    NotificationEventType.SYSTEM, "USER", u.getId(), "/admin/users");
        } else if ("ROLE_COMPLIANCE_OFFICER".equals(role)) {
            sendNotificationToUser(u, "Compliance & Governance Portal Active",
                    "Retention policies, litigation legal holds, and immutable audit logs are available under Governance & Compliance.",
                    NotificationEventType.SYSTEM, "USER", u.getId(), "/governance");
        } else if ("ROLE_IT_SECURITY".equals(role)) {
            sendNotificationToUser(u, "Security Monitoring Active",
                    "Security audit ledger and SIEM forwarding are operational.",
                    NotificationEventType.SYSTEM, "USER", u.getId(), "/governance");
        } else if ("ROLE_CONTENT_OWNER".equals(role)) {
            sendNotificationToUser(u, "Content Management Access",
                    "You can manage department folder structures, access control lists, and review document approval submissions.",
                    NotificationEventType.SYSTEM, "USER", u.getId(), "/approvals");
        } else if ("ROLE_CONTRIBUTOR".equals(role)) {
            sendNotificationToUser(u, "Contributor Workspace Ready",
                    "Upload new documents, create folders, check out files for editing, and participate in approval workflows.",
                    NotificationEventType.SYSTEM, "USER", u.getId(), "/library");
        }
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", n.getId());
        row.put("title", n.getTitle());
        row.put("message", n.getMessage());
        row.put("isRead", n.getIsRead());
        row.put("readAt", n.getReadAt());
        row.put("createdAt", n.getCreatedAt());
        row.put("eventType", n.getEventType());
        row.put("targetType", n.getTargetType());
        row.put("targetId", n.getTargetId());
        row.put("actionUrl", n.getActionUrl());
        return row;
    }
}
