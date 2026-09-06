package com.enterprise.kms;

import com.enterprise.kms.dto.DiscussionAttachmentDTO;
import com.enterprise.kms.entity.DiscussionAttachment;
import com.enterprise.kms.entity.DiscussionTopic;
import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.repository.DiscussionAttachmentRepository;
import com.enterprise.kms.repository.DiscussionReplyRepository;
import com.enterprise.kms.repository.DiscussionTopicRepository;
import com.enterprise.kms.repository.StorageObjectRepository;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.DiscussionMediaService;
import com.enterprise.kms.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class DiscussionAttachmentUnitTest {

    private DiscussionTopicRepository topicRepository;
    private DiscussionReplyRepository replyRepository;
    private DiscussionAttachmentRepository attachmentRepository;
    private StorageObjectRepository storageObjectRepository;
    private StorageService storageService;
    private AuditService auditService;
    private DiscussionMediaService mediaService;

    @TempDir
    Path tempStorageDir;

    private UUID topicId;
    private DiscussionTopic mockTopic;

    @BeforeEach
    void setUp() {
        topicRepository = Mockito.mock(DiscussionTopicRepository.class);
        replyRepository = Mockito.mock(DiscussionReplyRepository.class);
        attachmentRepository = Mockito.mock(DiscussionAttachmentRepository.class);
        storageObjectRepository = Mockito.mock(StorageObjectRepository.class);
        storageService = Mockito.mock(StorageService.class);
        auditService = Mockito.mock(AuditService.class);

        when(storageService.getStorageLocation()).thenReturn(tempStorageDir);

        mediaService = new DiscussionMediaService(
                topicRepository,
                replyRepository,
                attachmentRepository,
                storageObjectRepository,
                storageService,
                auditService
        );

        topicId = UUID.randomUUID();
        mockTopic = new DiscussionTopic();
        mockTopic.setId(topicId);
        mockTopic.setTitle("Test Discussion");
        mockTopic.setStatus("OPEN");
        mockTopic.setAuthorUsername("alice");

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(mockTopic));
        when(storageObjectRepository.findByChecksumSha256(any())).thenReturn(Optional.empty());
        when(storageObjectRepository.save(any(StorageObject.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attachmentRepository.save(any(DiscussionAttachment.class))).thenAnswer(inv -> {
            DiscussionAttachment a = inv.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });
    }

    @Test
    @DisplayName("Valid PNG image upload succeeds with secure storage and DTO")
    void testValidPngUpload() {
        // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile(
                "file", "screenshot.png", "image/png", pngHeader
        );

        DiscussionAttachmentDTO dto = mediaService.uploadMedia(topicId, null, file, "IMAGE", null, "alice");

        assertNotNull(dto);
        assertNotNull(dto.getId());
        assertEquals("IMAGE", dto.getMediaType());
        assertEquals("screenshot.png", dto.getOriginalFilename());
        assertEquals("alice", dto.getUploadedBy());
        assertTrue(dto.getObjectKey().startsWith("discussion-media/discussions/" + topicId + "/images/"));
        assertTrue(dto.getObjectKey().endsWith(".png"));
    }

    @Test
    @DisplayName("Valid WebM voice note upload succeeds with duration and audio storage path")
    void testValidWebmVoiceUpload() {
        // WebM / Matroska magic bytes: 0x1A 0x45 0xDF 0xA3
        byte[] webmHeader = new byte[]{(byte) 0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile(
                "file", "voicenote.webm", "audio/webm;codecs=opus", webmHeader
        );

        DiscussionAttachmentDTO dto = mediaService.uploadMedia(topicId, null, file, "AUDIO", 24, "bob");

        assertNotNull(dto);
        assertNotNull(dto.getId());
        assertEquals("AUDIO", dto.getMediaType());
        assertEquals(24, dto.getDurationSeconds());
        assertEquals("bob", dto.getUploadedBy());
        assertTrue(dto.getObjectKey().startsWith("discussion-media/discussions/" + topicId + "/audio/"));
        assertTrue(dto.getObjectKey().endsWith(".webm"));
    }

    @Test
    @DisplayName("Oversized image (>5MB) is rejected with 400 Bad Request")
    void testOversizedImageRejected() {
        byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6MB
        largeBytes[0] = (byte) 0x89;
        largeBytes[1] = 0x50;
        largeBytes[2] = 0x4E;
        largeBytes[3] = 0x47;

        MockMultipartFile file = new MockMultipartFile(
                "file", "giant.png", "image/png", largeBytes
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.uploadMedia(topicId, null, file, "IMAGE", null, "alice")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("exceeds maximum allowed limit of 5 MB"));
    }

    @Test
    @DisplayName("Oversized audio (>10MB) is rejected with 400 Bad Request")
    void testOversizedAudioRejected() {
        byte[] largeBytes = new byte[11 * 1024 * 1024]; // 11MB
        largeBytes[0] = 0x1A;
        largeBytes[1] = 0x45;
        largeBytes[2] = (byte) 0xDF;
        largeBytes[3] = (byte) 0xA3;

        MockMultipartFile file = new MockMultipartFile(
                "file", "long_podcast.webm", "audio/webm", largeBytes
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.uploadMedia(topicId, null, file, "AUDIO", 60, "alice")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("exceeds maximum allowed limit of 10 MB"));
    }

    @Test
    @DisplayName("Voice recording duration exceeding 300s is rejected with 400 Bad Request")
    void testExcessiveVoiceDurationRejected() {
        byte[] webmHeader = new byte[]{(byte) 0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};
        MockMultipartFile file = new MockMultipartFile(
                "file", "voicenote.webm", "audio/webm", webmHeader
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.uploadMedia(topicId, null, file, "AUDIO", 350, "alice")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("exceeds maximum allowed limit of 300 seconds"));
    }

    @Test
    @DisplayName("Fake image file with invalid magic bytes is rejected with 400 Bad Request")
    void testInvalidMagicBytesRejected() {
        // Plain text executable or script masquerading as image
        byte[] fakeBytes = "echo 'malicious payload'".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "danger.png", "image/png", fakeBytes
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.uploadMedia(topicId, null, file, "IMAGE", null, "mallory")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Image content failed magic byte signature verification"));
    }

    @Test
    @DisplayName("Upload to CLOSED discussion is rejected with 400 Bad Request")
    void testClosedDiscussionRejectsUpload() {
        mockTopic.setStatus("CLOSED");
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile(
                "file", "screenshot.png", "image/png", pngHeader
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.uploadMedia(topicId, null, file, "IMAGE", null, "alice")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Cannot upload media to a closed discussion topic"));
    }

    @Test
    @DisplayName("Unauthorized user cannot delete another user's attachment")
    void testUnauthorizedDeleteRejected() {
        UUID attachmentId = UUID.randomUUID();
        DiscussionAttachment att = new DiscussionAttachment();
        att.setId(attachmentId);
        att.setDiscussion(mockTopic);
        att.setUploadedBy("alice");
        att.setObjectKey("discussion-media/discussions/" + topicId + "/images/test.png");

        when(attachmentRepository.findByIdAndDiscussionId(attachmentId, topicId)).thenReturn(Optional.of(att));

        // bob (non-admin, not uploader) tries to delete alice's media
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.deleteMedia(topicId, attachmentId, "bob", false)
        );
        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Only the uploader or a system administrator can delete"));
    }

    @Test
    @DisplayName("IDOR prevention: Accessing attachment under wrong discussion ID returns 404")
    void testIdorAccessReturns404() {
        UUID attachmentId = UUID.randomUUID();
        UUID otherDiscussionId = UUID.randomUUID();

        // Looking up attachment under otherDiscussionId returns Optional.empty()
        when(attachmentRepository.findByIdAndDiscussionId(attachmentId, otherDiscussionId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                mediaService.getMediaMetadata(otherDiscussionId, attachmentId)
        );
        assertEquals(404, ex.getStatusCode().value());
    }
}
