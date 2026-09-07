package com.enterprise.kms;

import com.enterprise.kms.controller.UserController;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.ApprovalService;
import com.enterprise.kms.service.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserAvatarUnitTest {

    private UserRepository userRepository;
    private ApprovalService approvalService;
    private StorageService storageService;
    private UserController userController;

    private static final String TEST_USER = "test.employee";
    private static final String TEST_EMAIL = "test.employee@enterprise.internal";

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        approvalService = Mockito.mock(ApprovalService.class);
        storageService = Mockito.mock(StorageService.class);
        userController = new UserController(userRepository, approvalService, storageService);

        // Mock SecurityContext with JWT principal
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .claim("preferred_username", TEST_USER)
                .claim("email", TEST_EMAIL)
                .claim("sub", "keycloak-sub-123")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        Authentication auth = new UsernamePasswordAuthenticationToken(
                jwt,
                "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET /api/v1/users/me - Returns avatarUrl in profile response")
    void testGetCurrentUserProfileIncludesAvatar() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(TEST_USER);
        user.setEmail(TEST_EMAIL);
        user.setAvatarUrl("/api/v1/users/avatar/test-photo.png");

        when(userRepository.findByUsername(TEST_USER)).thenReturn(Optional.of(user));

        ResponseEntity<Map<String, Object>> response = userController.getCurrentUserProfile(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("/api/v1/users/avatar/test-photo.png", response.getBody().get("avatarUrl"));
        assertEquals(TEST_USER, response.getBody().get("username"));
    }

    @Test
    @DisplayName("POST /api/v1/users/me/avatar - Rejects empty or null file")
    void testUploadAvatarEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> userController.uploadAvatar(emptyFile));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("select an image"));
    }

    @Test
    @DisplayName("POST /api/v1/users/me/avatar - Rejects file larger than 5 MB")
    void testUploadAvatarOversizedFile() {
        byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6 MB
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.png", "image/png", largeBytes);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> userController.uploadAvatar(largeFile));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("less than 5 MB"));
    }

    @Test
    @DisplayName("POST /api/v1/users/me/avatar - Rejects invalid mime-type and extension")
    void testUploadAvatarInvalidType() {
        MockMultipartFile invalidFile = new MockMultipartFile("file", "payload.exe", "application/x-msdownload", "evil".getBytes());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> userController.uploadAvatar(invalidFile));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Invalid image format"));
    }

    @Test
    @DisplayName("POST /api/v1/users/me/avatar - Successfully uploads photo and cleans old avatar")
    void testUploadAvatarSuccess() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(TEST_USER);
        user.setEmail(TEST_EMAIL);
        user.setAvatarUrl("/api/v1/users/avatar/old-photo.jpg");

        when(userRepository.findByUsername(TEST_USER)).thenReturn(Optional.of(user));
        when(storageService.storeAvatar(any(), eq(TEST_USER))).thenReturn("/api/v1/users/avatar/new-photo.png");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", "png-content".getBytes());
        ResponseEntity<Map<String, Object>> response = userController.uploadAvatar(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().get("status"));
        assertEquals("/api/v1/users/avatar/new-photo.png", response.getBody().get("avatarUrl"));

        // Verify old avatar was deleted
        verify(storageService, times(1)).deleteAvatarFile("/api/v1/users/avatar/old-photo.jpg");
        // Verify new avatar was stored
        verify(storageService, times(1)).storeAvatar(file, TEST_USER);
        // Verify user entity updated
        assertEquals("/api/v1/users/avatar/new-photo.png", user.getAvatarUrl());
    }

    @Test
    @DisplayName("DELETE /api/v1/users/me/avatar - Successfully removes avatar")
    void testDeleteAvatarSuccess() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(TEST_USER);
        user.setEmail(TEST_EMAIL);
        user.setAvatarUrl("/api/v1/users/avatar/photo-to-remove.png");

        when(userRepository.findByUsername(TEST_USER)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = userController.deleteAvatar();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().get("status"));
        assertNull(response.getBody().get("avatarUrl"));

        verify(storageService, times(1)).deleteAvatarFile("/api/v1/users/avatar/photo-to-remove.png");
        assertNull(user.getAvatarUrl());
    }

    @Test
    @DisplayName("GET /api/v1/users/avatar/{fileName} - Rejects path traversal attempts")
    void testGetAvatarPathTraversal() {
        ResponseEntity<InputStreamResource> res1 = userController.getAvatar("../secret.txt");
        assertEquals(HttpStatus.BAD_REQUEST, res1.getStatusCode());

        ResponseEntity<InputStreamResource> res2 = userController.getAvatar("sub/avatar.png");
        assertEquals(HttpStatus.BAD_REQUEST, res2.getStatusCode());
    }

    @Test
    @DisplayName("GET /api/v1/users/avatar/{fileName} - Streams existing avatar file")
    void testGetAvatarServing() throws IOException {
        Path tempFile = Files.createTempFile("avatar-test-", ".png");
        Files.write(tempFile, "fake-image-bytes".getBytes());

        when(storageService.loadAvatar("avatar-test.png")).thenReturn(tempFile);

        ResponseEntity<InputStreamResource> res = userController.getAvatar("avatar-test.png");
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, res.getHeaders().getContentType());
        assertNotNull(res.getBody());

        Files.deleteIfExists(tempFile);
    }
}
