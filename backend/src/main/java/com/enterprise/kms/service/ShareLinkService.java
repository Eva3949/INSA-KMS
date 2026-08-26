package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.entity.DocumentPermission;
import com.enterprise.kms.entity.ShareLink;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.ShareLinkRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * FR-20 secure share links: create time-limited, optionally password-protected
 * share links that grant a VIEW permission to any recipient who possesses the token.
 */
@Service
public class ShareLinkService {
    private final ShareLinkRepository shareLinkRepository;
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;
    private final SecureRandom secureRandom = new SecureRandom();

    public ShareLinkService(ShareLinkRepository shareLinkRepository,
                            DocumentRepository documentRepository,
                            PermissionService permissionService) {
        this.shareLinkRepository = shareLinkRepository;
        this.documentRepository = documentRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public Map<String, Object> createShareLink(UUID documentId, String creatorUsername, int expiryHours, String password) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        // generate random token and hash it for storage
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = sha256(token);

        ShareLink link = new ShareLink();
        link.setDocument(doc);
        link.setTokenHash(tokenHash);
        link.setPermissionLevel("VIEW");
        link.setExpiresAt(OffsetDateTime.now().plusHours(Math.max(1, Math.min(expiryHours, 720))));
        link.setCreatedAt(OffsetDateTime.now());

        if (password != null && !password.isBlank()) {
            link.setPasswordHash(sha256(password));
        }

        link = shareLinkRepository.save(link);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", link.getId());
        result.put("token", token);
        result.put("shareUrl", "/api/v1/shared/" + token);
        result.put("expiresAt", link.getExpiresAt());
        result.put("passwordProtected", password != null && !password.isBlank());
        result.put("documentTitle", doc.getTitle());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> validateShareLink(String token, String password) {
        String tokenHash = sha256(token);
        ShareLink link = shareLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid share link"));

        if (link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "This share link has expired");
        }

        if (link.getPasswordHash() != null && !link.getPasswordHash().isEmpty()) {
            if (password == null || !sha256(password).equals(link.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid password for this share link");
            }
        }

        Document doc = link.getDocument();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentId", doc.getId());
        result.put("title", doc.getTitle());
        result.put("permissionLevel", link.getPermissionLevel());
        result.put("expiresAt", link.getExpiresAt());
        return result;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
