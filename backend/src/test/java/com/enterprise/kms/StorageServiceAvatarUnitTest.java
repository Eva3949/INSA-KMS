package com.enterprise.kms;

import com.enterprise.kms.repository.StorageObjectRepository;
import com.enterprise.kms.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class StorageServiceAvatarUnitTest {

    @TempDir
    Path tempStorageDir;

    private StorageService storageService;
    private StorageObjectRepository storageObjectRepository;

    @BeforeEach
    void setUp() {
        storageObjectRepository = Mockito.mock(StorageObjectRepository.class);
        storageService = new StorageService(
                storageObjectRepository,
                tempStorageDir.toString(),
                false,
                null,
                null
        );
    }

    @Test
    @DisplayName("storeAvatar stores file in avatars subfolder and returns URL")
    void testStoreAvatar() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "custom_photo.png",
                "image/png",
                "sample-image-bytes".getBytes()
        );

        String avatarUrl = storageService.storeAvatar(file, "test_user");
        assertNotNull(avatarUrl);
        assertTrue(avatarUrl.startsWith("/api/v1/users/avatar/avatar_test_user_"));
        assertTrue(avatarUrl.endsWith(".png"));

        String filename = avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1);
        Path storedFile = storageService.loadAvatar(filename);
        assertTrue(Files.exists(storedFile));
        assertEquals("sample-image-bytes", Files.readString(storedFile));
    }

    @Test
    @DisplayName("loadAvatar rejects directory traversal attempts")
    void testLoadAvatarRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> storageService.loadAvatar("../secrets.txt"));
        assertThrows(SecurityException.class, () -> storageService.loadAvatar("sub/avatar.png"));
    }

    @Test
    @DisplayName("deleteAvatarFile removes stored avatar file")
    void testDeleteAvatarFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "photo.jpg",
                "image/jpeg",
                "sample-jpg".getBytes()
        );

        String avatarUrl = storageService.storeAvatar(file, "delete_user");
        String filename = avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1);

        Path storedFile = storageService.loadAvatar(filename);
        assertTrue(Files.exists(storedFile));

        storageService.deleteAvatarFile(avatarUrl);
        assertFalse(Files.exists(storedFile));
    }
}
