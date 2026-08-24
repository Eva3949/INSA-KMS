package com.enterprise.kms.service;

import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.repository.StorageObjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class StorageService {
    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final StorageObjectRepository storageObjectRepository;
    private final Path storageLocation;

    public StorageService(StorageObjectRepository storageObjectRepository,
                          @Value("${kms.storage.location:kms-storage-data}") String configuredLocation) {
        this.storageObjectRepository = storageObjectRepository;
        this.storageLocation = Paths.get(configuredLocation).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            log.info("KMS document storage location: {}", this.storageLocation);
        } catch (Exception e) {
            throw new RuntimeException("Could not initialize storage location " + this.storageLocation, e);
        }
    }

    public Path getStorageLocation() {
        return storageLocation;
    }

    public StorageObject storeFile(MultipartFile file) {
        Path targetPath = null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String storedName = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
            targetPath = this.storageLocation.resolve(storedName);

            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String sha256 = HexFormat.of().formatHex(digest.digest());

            // BR-06 de-duplication: identical content is stored once
            java.util.Optional<StorageObject> existing = storageObjectRepository.findByChecksumSha256(sha256);
            if (existing.isPresent()) {
                Files.deleteIfExists(targetPath);
                return existing.get();
            }

            StorageObject storageObject = new StorageObject();
            // Store the file name only — the directory comes from configuration, so rows stay
            // portable between environments (Windows dev, Linux container, mounted volume).
            storageObject.setStoragePath(storedName);
            storageObject.setChecksumSha256(sha256);
            storageObject.setFileSizeBytes(file.getSize());

            return storageObjectRepository.save(storageObject);
        } catch (Exception e) {
            // Never leave a written file behind when the upload fails
            if (targetPath != null) {
                try {
                    Files.deleteIfExists(targetPath);
                } catch (Exception cleanupFailure) {
                    log.warn("Could not clean up partial upload {}: {}", targetPath, cleanupFailure.getMessage());
                }
            }
            throw new RuntimeException("Failed to store physical file binary", e);
        }
    }

    /** Resolves a stored path (file name, or a legacy absolute path) to a readable file. */
    public Path resolve(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return null;
        }
        Path candidate = Paths.get(storagePath);
        if (candidate.isAbsolute()) {
            return candidate.normalize();
        }
        return this.storageLocation.resolve(storagePath).normalize();
    }

    public boolean exists(String storagePath) {
        Path resolved = resolve(storagePath);
        return resolved != null && Files.isReadable(resolved);
    }

    private String sanitize(String originalFilename) {
        String name = (originalFilename == null || originalFilename.isBlank()) ? "document.bin" : originalFilename;
        return Paths.get(name).getFileName().toString().replaceAll("[\\\\/:*?\"<>|]", "_");
    }
}
