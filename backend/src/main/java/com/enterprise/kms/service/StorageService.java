package com.enterprise.kms.service;

import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.repository.StorageObjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
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
    private final StorageObjectRepository storageObjectRepository;
    private final Path storageLocation = Paths.get("kms-storage-data").toAbsolutePath().normalize();

    public StorageService(StorageObjectRepository storageObjectRepository) {
        this.storageObjectRepository = storageObjectRepository;
        try {
            Files.createDirectories(this.storageLocation);
        } catch (Exception e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    public StorageObject storeFile(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path targetPath = this.storageLocation.resolve(filename);

            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String sha256 = HexFormat.of().formatHex(digest.digest());

            StorageObject storageObject = new StorageObject();
            storageObject.setStoragePath(targetPath.toString());
            storageObject.setChecksumSha256(sha256);
            storageObject.setFileSizeBytes(file.getSize());

            return storageObjectRepository.save(storageObject);
        } catch (Exception e) {
            throw new RuntimeException("Failed to store physical file binary", e);
        }
    }
}
