package com.enterprise.kms.service;

import com.enterprise.kms.entity.Notification;
import com.enterprise.kms.entity.Subscription;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.NotificationRepository;
import com.enterprise.kms.repository.SubscriptionRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FR-26 notifications: per-user in-app notification feed, with optional email
 * delivery via EmailService. Documents (and their tags) are the primary event
 * source — callers create notifications when share, approval, comment, or
 * retention events occur.
 */
@Service
public class NotificationService {
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
            n.setReadAt(java.time.OffsetDateTime.now());
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead(UUID userId) {
        for (Notification n : notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, Pageable.unpaged()).getContent()) {
            n.setIsRead(true);
            n.setReadAt(java.time.OffsetDateTime.now());
            notificationRepository.save(n);
        }
    }

    /** Create an in-app notification for username (and optionally send email). */
    @Transactional
    public void sendNotification(String username, String title, String message) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            sendNotificationToUser(user, title, message);
        }
    }

    /** Create an in-app notification for a User entity. */
    @Transactional
    public void sendNotificationToUser(User user, String title, String message) {
        if (user == null) return;

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setIsRead(false);
        notificationRepository.save(n);

        if (user.getEmail() != null) {
            emailService.notify(user.getEmail(), title, message);
        }
    }

    /** Broadcast notification to all users matching a role. */
    @Transactional
    public void sendNotificationToRole(String roleName, String title, String message) {
        List<User> users = userRepository.findByRoleName(roleName);
        for (User u : users) {
            sendNotificationToUser(u, title, message);
        }
    }

    /** Notify subscribers of targetType + targetId according to preference type. */
    @Transactional
    public void notifySubscribers(String targetType, UUID targetId, String eventType, String title, String message) {
        List<Subscription> subs = subscriptionRepository.findByTargetTypeAndTargetId(targetType, targetId);
        for (Subscription sub : subs) {
            boolean allow = switch (eventType.toUpperCase()) {
                case "VERSION" -> Boolean.TRUE.equals(sub.getNotifyVersions());
                case "COMMENT" -> Boolean.TRUE.equals(sub.getNotifyComments());
                case "SHARE" -> Boolean.TRUE.equals(sub.getNotifyShares());
                default -> true;
            };
            if (allow && sub.getUser() != null) {
                sendNotificationToUser(sub.getUser(), title, message);
            }
        }
    }

    private void seedDefaultNotificationsForUser(UUID userId) {
        User u = userRepository.findById(userId).orElse(null);
        if (u == null) return;

        String role = u.getRoleName() != null ? u.getRoleName() : "ROLE_VIEWER";

        sendNotificationToUser(u, "Welcome to INSA Knowledge Management System",
                "Your account (" + u.getUsername() + ") is active with role " + role + ". You can search, browse, and manage organizational documents.");

        if ("ROLE_ADMIN".equals(role)) {
            sendNotificationToUser(u, "System Administrator Control Center",
                    "You have administrative privileges to manage users, storage quotas, retention policies, and security monitoring.");
        } else if ("ROLE_COMPLIANCE_OFFICER".equals(role)) {
            sendNotificationToUser(u, "Compliance & Governance Portal Active",
                    "Retention policies, litigation legal holds, and immutable audit logs are available under Governance & Compliance.");
        } else if ("ROLE_IT_SECURITY".equals(role)) {
            sendNotificationToUser(u, "Security Monitoring Active",
                    "Security audit ledger and SIEM forwarding are operational.");
        } else if ("ROLE_CONTENT_OWNER".equals(role)) {
            sendNotificationToUser(u, "Content Management Access",
                    "You can manage department folder structures, access control lists, and review document approval submissions.");
        } else if ("ROLE_CONTRIBUTOR".equals(role)) {
            sendNotificationToUser(u, "Contributor Workspace Ready",
                    "Upload new documents, create folders, check out files for editing, and participate in approval workflows.");
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
        return row;
    }
}
