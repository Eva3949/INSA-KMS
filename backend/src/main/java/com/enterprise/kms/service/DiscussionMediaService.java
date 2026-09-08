package com.enterprise.kms.service;

import com.enterprise.kms.dto.DiscussionAttachmentDTO;
import com.enterprise.kms.entity.DiscussionAttachment;
import com.enterprise.kms.entity.DiscussionReply;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DiscussionAttachmentRepository;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.*;

@Service
public class DiscussionMediaService {

    private static final Logger log = LoggerFactory.getLogger(DiscussionMediaService.class);

    public static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    public static final long MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    public static final int MAX_AUDIO_DURATION_SECONDS = 300; // 5 minutes

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_AUDIO_EXTENSIONS = Set.of("webm", "ogg", "mp4", "m4a", "wav", "mp3");

    private static final Set<String> ALLOWED_IMAGE_MIMES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_AUDIO_MIMES = Set.of(
            "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a",
            "audio/webm;codecs=opus", "audio/ogg;codecs=opus"
    );

    private final DiscussionTopicRepository topicRepository;
    private final DiscussionReplyRepository replyRepository;
    private final DiscussionAttachmentRepository attachmentRepository;
    private final StorageObjectRepository storageObjectRepository;
    private final StorageService storageService;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public DiscussionMediaService(DiscussionTopicRepository topicRepository,
                                  DiscussionReplyRepository replyRepository,
                                  DiscussionAttachmentRepository attachmentRepository,
                                  StorageObjectRepository storageObjectRepository,
                                  StorageService storageService,
                                  AuditService auditService) {
        this(topicRepository, replyRepository, attachmentRepository, storageObjectRepository, storageService, auditService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DiscussionMediaService(DiscussionTopicRepository topicRepository,
                                  DiscussionReplyRepository replyRepository,
                                  DiscussionAttachmentRepository attachmentRepository,
                                  StorageObjectRepository storageObjectRepository,
                                  StorageService storageService,
                                  AuditService auditService,
                                  UserRepository userRepository) {
        this.topicRepository = topicRepository;
        this.replyRepository = replyRepository;
        this.attachmentRepository = attachmentRepository;
        this.storageObjectRepository = storageObjectRepository;
        this.storageService = storageService;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    public boolean isUserAuthorizedForDiscussion(DiscussionTopic topic, String username, boolean isAdmin) {
        if (topic == null || username == null || username.isBlank()) return false;
        if (isAdmin) return true;
        if (topic.getAuthorUsername() != null && topic.getAuthorUsername().equalsIgnoreCase(username)) return true;

        String visibility = topic.getVisibility() != null ? topic.getVisibility().toUpperCase().trim() : "PUBLIC";
        if ("PUBLIC".equals(visibility)) return true;

        User currentUser = userRepository.findByUsername(username)
                .or(() -> userRepository.findByKeycloakSub("sub-" + username))
                .orElse(null);
        if (currentUser == null) return false;

        if ("INTERNAL".equals(visibility)) {
            if (currentUser.getDepartment() == null || topic.getAllowedDepartments() == null) return false;
            UUID userDeptId = currentUser.getDepartment().getId();
            return topic.getAllowedDepartments().stream().anyMatch(d -> d.getId().equals(userDeptId));
        }

        if ("CONFIDENTIAL".equals(visibility)) {
            if (topic.getParticipants() == null) return false;
            return topic.getParticipants().stream().anyMatch(p -> p.getId().equals(currentUser.getId()) ||
                    (p.getUsername() != null && p.getUsername().equalsIgnoreCase(username)));
        }

        return false;
    }

    public void validateDiscussionAccess(DiscussionTopic topic, String username, boolean isAdmin) {
        if (!isUserAuthorizedForDiscussion(topic, username, isAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You are not authorized to access attachments in this discussion");
        }
    }

    @Transactional
    public DiscussionAttachmentDTO uploadMedia(UUID discussionId,
                                              UUID replyId,
                                              MultipartFile file,
                                              String mediaTypeHint,
                                              Integer durationSeconds,
                                              String username,
                                              boolean isAdmin) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File payload cannot be empty");
        }

        DiscussionTopic topic = topicRepository.findById(discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateDiscussionAccess(topic, username, isAdmin);

        if ("CLOSED".equalsIgnoreCase(topic.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot upload media to a closed discussion topic");
        }

        DiscussionReply reply = null;
        if (replyId != null) {
            reply = replyRepository.findById(replyId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion reply not found"));
            if (!reply.getTopic().getId().equals(discussionId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply does not belong to this discussion topic");
            }
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment.bin";
        String ext = getFileExtension(originalFilename).toLowerCase();
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase().trim() : "";
        if (contentType.contains(";")) {
            // Keep base MIME for classification while tolerating codecs parameter
            contentType = contentType.split(";")[0].trim();
        }

        // Determine media type (IMAGE vs AUDIO)
        String mediaType = determineMediaType(mediaTypeHint, contentType, ext);

        // Validate by media type
        byte[] fileBytes;
        String checksumSha256;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                fileBytes = dis.readAllBytes();
            }
            checksumSha256 = HexFormat.of().formatHex(digest.digest());
        } catch (Exception e) {
            log.error("Failed to read uploaded media bytes for discussion {}", discussionId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read file binary");
        }

        long fileSize = fileBytes.length;

        if ("IMAGE".equalsIgnoreCase(mediaType)) {
            validateImage(fileBytes, ext, contentType, fileSize);
        } else if ("AUDIO".equalsIgnoreCase(mediaType)) {
            validateAudio(fileBytes, ext, contentType, fileSize, durationSeconds);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported media type: " + mediaType);
        }

        // Generate cryptographically random secure object key adhering to:
        // discussion-media/discussions/{discussionId}/images/{uuid}.{ext}
        // discussion-media/discussions/{discussionId}/audio/{uuid}.{ext}
        String subfolder = "IMAGE".equalsIgnoreCase(mediaType) ? "images" : "audio";
        String safeExt = ext.isBlank() ? ("IMAGE".equalsIgnoreCase(mediaType) ? "png" : "webm") : ext;
        String objectKey = String.format("discussion-media/discussions/%s/%s/%s.%s",
                discussionId, subfolder, UUID.randomUUID(), safeExt);

        // Store physical file binary in KMS storage
        try {
            Path targetPath = storageService.getStorageLocation().resolve(objectKey).normalize();
            Files.createDirectories(targetPath.getParent());
            try (OutputStream os = Files.newOutputStream(targetPath)) {
                os.write(fileBytes);
            }
        } catch (Exception e) {
            log.error("Failed to store physical media file: {}", objectKey, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file binary");
        }

        // Record StorageObject
        StorageObject storageObject = storageObjectRepository.findByChecksumSha256(checksumSha256)
                .orElseGet(() -> {
                    StorageObject so = new StorageObject();
                    so.setStoragePath(objectKey);
                    so.setChecksumSha256(checksumSha256);
                    so.setFileSizeBytes(fileSize);
                    return storageObjectRepository.save(so);
                });

        // Save DiscussionAttachment record in PostgreSQL
        DiscussionAttachment attachment = new DiscussionAttachment();
        attachment.setDiscussion(topic);
        attachment.setReply(reply);
        attachment.setMediaType(mediaType);
        attachment.setMimeType(contentType.isBlank() ? ("IMAGE".equalsIgnoreCase(mediaType) ? "image/jpeg" : "audio/webm") : contentType);
        attachment.setOriginalFilename(originalFilename);
        attachment.setObjectKey(objectKey);
        attachment.setFileSizeBytes(fileSize);
        attachment.setDurationSeconds(durationSeconds != null ? durationSeconds : 0);
        attachment.setChecksumSha256(checksumSha256);
        attachment.setStorageObject(storageObject);
        attachment.setUploadedBy(username);

        DiscussionAttachment saved = attachmentRepository.save(attachment);

        // Record safe audit log
        String auditAction = "IMAGE".equalsIgnoreCase(mediaType) ? "DISCUSSION_IMAGE_UPLOADED" : "DISCUSSION_AUDIO_UPLOADED";
        try {
            String details = String.format("{\"filename\":\"%s\",\"size\":%d,\"mediaType\":\"%s\",\"duration\":%d}",
                    sanitizeFilenameForJson(originalFilename), fileSize, mediaType, durationSeconds != null ? durationSeconds : 0);
            auditService.recordAuditLog(username, null, auditAction, "DISCUSSION_ATTACHMENT", saved.getId().toString(), null, details);
        } catch (Exception e) {
            log.warn("Failed to record audit log for media upload: {}", e.getMessage());
        }

        return toDTO(saved);
    }

    @Transactional
    public DiscussionAttachmentDTO uploadMedia(UUID discussionId,
                                              UUID replyId,
                                              MultipartFile file,
                                              String mediaTypeHint,
                                              Integer durationSeconds,
                                              String username) {
        return uploadMedia(discussionId, replyId, file, mediaTypeHint, durationSeconds, username, false);
    }

    @Transactional(readOnly = true)
    public DiscussionAttachmentDTO getMediaMetadata(UUID discussionId, UUID mediaId, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateDiscussionAccess(topic, username, isAdmin);

        DiscussionAttachment att = attachmentRepository.findByIdAndDiscussionId(mediaId, discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion media attachment not found"));
        return toDTO(att);
    }

    @Transactional(readOnly = true)
    public DiscussionAttachmentDTO getMediaMetadata(UUID discussionId, UUID mediaId) {
        return getMediaMetadata(discussionId, mediaId, null, false);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> streamMediaContent(UUID discussionId, UUID mediaId, String username, boolean isAdmin) {
        DiscussionTopic topic = topicRepository.findById(discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion topic not found"));

        validateDiscussionAccess(topic, username, isAdmin);

        DiscussionAttachment att = attachmentRepository.findByIdAndDiscussionId(mediaId, discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion media attachment not found"));

        try {
            Path physicalPath = resolvePhysicalPath(att);
            if (physicalPath == null || !Files.exists(physicalPath) || !Files.isReadable(physicalPath)) {
                log.warn("Discussion media binary not found on storage: discussionId={}, mediaId={}, objectKey={}",
                        discussionId, mediaId, att.getObjectKey());
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion media binary not found on storage");
            }

            InputStream fis = Files.newInputStream(physicalPath);
            Resource resource = new InputStreamResource(fis);

            // Audit media access
            try {
                String details = String.format("{\"filename\":\"%s\",\"mediaType\":\"%s\"}",
                        sanitizeFilenameForJson(att.getOriginalFilename()), att.getMediaType());
                auditService.recordAuditLog(username, null, "DISCUSSION_MEDIA_ACCESSED", "DISCUSSION_ATTACHMENT", att.getId().toString(), null, details);
            } catch (Exception ignored) {}

            long size = Files.size(physicalPath);
            String mime = (att.getMimeType() != null && !att.getMimeType().isBlank()) ? att.getMimeType() : "application/octet-stream";

            return ResponseEntity.ok()
                    .contentLength(size > 0 ? size : att.getFileSizeBytes())
                    .contentType(MediaType.parseMediaType(mime))
                    .header("Content-Disposition", "inline; filename=\"" + att.getOriginalFilename() + "\"")
                    .body(resource);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Failed to stream discussion media {}: {}", mediaId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to stream media binary");
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> streamMediaContent(UUID discussionId, UUID mediaId, String username) {
        return streamMediaContent(discussionId, mediaId, username, false);
    }

    private Path resolvePhysicalPath(DiscussionAttachment att) {
        if (att.getObjectKey() != null && !att.getObjectKey().isBlank()) {
            try {
                Path p = storageService.resolve(att.getObjectKey());
                if (p != null && Files.exists(p) && Files.isReadable(p)) {
                    return p;
                }
            } catch (Exception ignored) {}
        }
        if (att.getStorageObject() != null && att.getStorageObject().getStoragePath() != null) {
            try {
                Path p = storageService.resolve(att.getStorageObject().getStoragePath());
                if (p != null && Files.exists(p) && Files.isReadable(p)) {
                    return p;
                }
            } catch (Exception ignored) {}
        }
        if (att.getObjectKey() != null) {
            try {
                String filename = Paths.get(att.getObjectKey()).getFileName().toString();
                Path inStorage = storageService.getStorageLocation().resolve(filename).normalize();
                if (Files.exists(inStorage) && Files.isReadable(inStorage)) {
                    return inStorage;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    @Transactional
    public void deleteMedia(UUID discussionId, UUID mediaId, String username, boolean isAdmin) {
        DiscussionAttachment att = attachmentRepository.findByIdAndDiscussionId(mediaId, discussionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discussion media attachment not found"));

        boolean isUploader = att.getUploadedBy().equalsIgnoreCase(username);
        if (!isUploader && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the uploader or a system administrator can delete this media attachment");
        }

        // Delete physical file
        try {
            Path targetPath = storageService.getStorageLocation().resolve(att.getObjectKey()).normalize();
            Files.deleteIfExists(targetPath);
        } catch (Exception e) {
            log.warn("Could not delete physical media file {}: {}", att.getObjectKey(), e.getMessage());
        }

        attachmentRepository.delete(att);

        // Record audit log
        try {
            String details = String.format("{\"filename\":\"%s\",\"mediaType\":\"%s\"}",
                    sanitizeFilenameForJson(att.getOriginalFilename()), att.getMediaType());
            auditService.recordAuditLog(username, null, "DISCUSSION_MEDIA_DELETED", "DISCUSSION_ATTACHMENT", att.getId().toString(), null, details);
        } catch (Exception ignored) {}
    }

    @Transactional(readOnly = true)
    public List<DiscussionAttachmentDTO> getTopicAttachments(UUID topicId) {
        return attachmentRepository.findByDiscussionIdAndReplyIsNullOrderByCreatedAtAsc(topicId)
                .stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<DiscussionAttachmentDTO> getReplyAttachments(UUID replyId) {
        return attachmentRepository.findByReplyIdOrderByCreatedAtAsc(replyId)
                .stream().map(this::toDTO).toList();
    }

    public DiscussionAttachmentDTO toDTO(DiscussionAttachment att) {
        DiscussionAttachmentDTO dto = new DiscussionAttachmentDTO();
        dto.setId(att.getId());
        dto.setDiscussionId(att.getDiscussion().getId());
        dto.setReplyId(att.getReply() != null ? att.getReply().getId() : null);
        dto.setMediaType(att.getMediaType());
        dto.setMimeType(att.getMimeType());
        dto.setOriginalFilename(att.getOriginalFilename());
        dto.setObjectKey(att.getObjectKey());
        dto.setFileSizeBytes(att.getFileSizeBytes());
        dto.setDurationSeconds(att.getDurationSeconds());
        dto.setViewUrl(String.format("/api/v1/discussions/%s/media/%s/content", att.getDiscussion().getId(), att.getId()));
        dto.setDownloadUrl(String.format("/api/v1/discussions/%s/media/%s/content", att.getDiscussion().getId(), att.getId()));
        dto.setUploadedBy(att.getUploadedBy());
        dto.setCreatedAt(att.getCreatedAt());
        return dto;
    }

    private void validateImage(byte[] bytes, String ext, String mime, long size) {
        if (size > MAX_IMAGE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Image size %d bytes exceeds maximum allowed limit of 5 MB (%d bytes)", size, MAX_IMAGE_SIZE_BYTES));
        }

        if (!ALLOWED_IMAGE_EXTENSIONS.contains(ext) && !ALLOWED_IMAGE_MIMES.contains(mime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported image format. Allowed formats are: JPG, JPEG, PNG, WEBP.");
        }

        // Magic byte verification
        if (!verifyImageMagicBytes(bytes, ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image content failed magic byte signature verification (JPG, PNG, or WEBP).");
        }
    }

    private void validateAudio(byte[] bytes, String ext, String mime, long size, Integer durationSeconds) {
        if (size > MAX_AUDIO_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Audio size %d bytes exceeds maximum allowed limit of 10 MB (%d bytes)", size, MAX_AUDIO_SIZE_BYTES));
        }

        if (durationSeconds != null && durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Audio recording duration (%d seconds) exceeds maximum allowed limit of 300 seconds",
                            durationSeconds));
        }

        if (!ALLOWED_AUDIO_EXTENSIONS.contains(ext) && !ALLOWED_AUDIO_MIMES.contains(mime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported audio format. Allowed formats: audio/webm, audio/ogg, audio/mp4, audio/wav, audio/mpeg.");
        }

        if (!verifyAudioMagicBytes(bytes, ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File content does not match valid audio binary headers.");
        }
    }

    private boolean verifyImageMagicBytes(byte[] bytes, String ext) {
        if (bytes == null || bytes.length < 8) return false;

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return true;
        }

        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return true;
        }

        // WEBP: RIFF....WEBP
        if (bytes.length >= 12 &&
                bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && // RIFF
                bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) { // WEBP
            return true;
        }

        return false;
    }

    private boolean verifyAudioMagicBytes(byte[] bytes, String ext) {
        if (bytes == null || bytes.length < 4) return false;

        // WebM / EBML: 1A 45 DF A3
        if ((bytes[0] & 0xFF) == 0x1A && (bytes[1] & 0xFF) == 0x45 && (bytes[2] & 0xFF) == 0xDF && (bytes[3] & 0xFF) == 0xA3) {
            return true;
        }

        // OggS: 4F 67 67 53
        if (bytes[0] == 0x4F && bytes[1] == 0x67 && bytes[2] == 0x67 && bytes[3] == 0x53) {
            return true;
        }

        // MP4 / M4A: ftyp at offset 4
        if (bytes.length >= 8 && bytes[4] == 0x66 && bytes[5] == 0x74 && bytes[6] == 0x79 && bytes[7] == 0x70) {
            return true;
        }

        // ID3: 49 44 33
        if (bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) {
            return true;
        }

        // WAV: RIFF....WAVE
        if (bytes.length >= 12 &&
                bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                bytes[8] == 0x57 && bytes[9] == 0x41 && bytes[10] == 0x46 && bytes[11] == 0x45) {
            return true;
        }

        return false;
    }

    private String determineMediaType(String hint, String contentType, String ext) {
        if (hint != null && !hint.isBlank()) {
            if ("IMAGE".equalsIgnoreCase(hint.trim())) return "IMAGE";
            if ("AUDIO".equalsIgnoreCase(hint.trim())) return "AUDIO";
        }
        if (contentType.startsWith("image/") || ALLOWED_IMAGE_EXTENSIONS.contains(ext)) {
            return "IMAGE";
        }
        if (contentType.startsWith("audio/") || ALLOWED_AUDIO_EXTENSIONS.contains(ext)) {
            return "AUDIO";
        }
        return "IMAGE"; // default
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return (dot > 0 && dot < filename.length() - 1) ? filename.substring(dot + 1) : "";
    }

    private String sanitizeFilenameForJson(String filename) {
        if (filename == null) return "";
        return filename.replace("\"", "\\\"").replace("\r", "").replace("\n", "");
    }
}
