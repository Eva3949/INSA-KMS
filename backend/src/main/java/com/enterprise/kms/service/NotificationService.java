package com.enterprise.kms.service;

import com.enterprise.kms.entity.Notification;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.NotificationRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * FR-26 notifications: per-user in-app notification feed, with optional email
 * delivery via EmailService.  Documents (and their tags) are the primary event
 * source — callers create notifications when share, approval, comment, or
 * retention events occur.
 */
@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listNotifications(UUID userId, boolean unreadOnly, Pageable pageable) {
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
        Notification n = notificationRepository.findById(notificationId)
                .orElse(null);
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

    /** Create an in-app notification (and optionally send email). */
    @Transactional
    public void sendNotification(String username, String title, String message) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setIsRead(false);
        notificationRepository.save(n);

        // fire-and-forget email (SMTP may be disabled)
        if (user.getEmail() != null) {
            emailService.notify(user.getEmail(), title, message);
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
