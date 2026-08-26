package com.enterprise.kms.service;

import com.enterprise.kms.entity.StorageObject;
import com.enterprise.kms.repository.StorageObjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class StorageService {
    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final String ENCRYPTED_MARKER = "KMS_ENC_v1_";

    private final StorageObjectRepository storageObjectRepository;
    private final Path storageLocation;
    private final SecretKey encryptionKey;
    private final boolean encryptionEnabled;

    public StorageService(StorageObjectRepository storageObjectRepository,
                          @Value("${kms.storage.location:kms-storage-data}") String configuredLocation,
                          @Value("${kms.encryption.enabled:true}") boolean encryptionEnabled,
                          @Value("${kms.encryption.key:}") String encryptionKeyBase64) {
        this.storageObjectRepository = storageObjectRepository;
        this.storageLocation = Paths.get(configuredLocation).toAbsolutePath().normalize();
        this.encryptionEnabled = encryptionEnabled;

        if (encryptionEnabled) {
            this.encryptionKey = resolveEncryptionKey(encryptionKeyBase64);
            log.info("Encryption at rest: ENABLED (AES-256-GCM)");
        } else {
            this.encryptionKey = null;
            log.warn("Encryption at rest: DISABLED (kms.encryption.enabled=false). Data stored in plaintext.");
        }

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

    public boolean isEncryptionEnabled() {
        return encryptionEnabled;
    }

    public StorageObject storeFile(MultipartFile file) {
        Path targetPath = null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String storedName = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
            targetPath = this.storageLocation.resolve(storedName);

            byte[] plaintext;
            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                plaintext = dis.readAllBytes();
            }

            String sha256 = HexFormat.of().formatHex(digest.digest());

            java.util.Optional<StorageObject> existing = storageObjectRepository.findByChecksumSha256(sha256);
            if (existing.isPresent()) {
                return existing.get();
            }

            try (OutputStream fos = Files.newOutputStream(targetPath)) {
                if (encryptionEnabled && encryptionKey != null) {
                    try (CipherOutputStream cos = new CipherOutputStream(fos, initEncryptCipher())) {
                        cos.write(plaintext);
                    }
                } else {
                    fos.write(plaintext);
                }
            }

            StorageObject storageObject = new StorageObject();
            storageObject.setStoragePath(storedName);
            storageObject.setChecksumSha256(sha256);
            storageObject.setFileSizeBytes(file.getSize());

            return storageObjectRepository.save(storageObject);
        } catch (Exception e) {
            if (targetPath != null) {
                try { Files.deleteIfExists(targetPath); } catch (Exception ignored) {}
            }
            throw new RuntimeException("Failed to store physical file binary", e);
        }
    }

    public InputStream retrieve(String storagePath) throws Exception {
        Path resolved = resolve(storagePath);
        if (resolved == null || !Files.exists(resolved)) {
            throw new FileNotFoundException("Storage object not found: " + storagePath);
        }

        FileInputStream fis = new FileInputStream(resolved.toFile());
        if (encryptionEnabled && encryptionKey != null) {
            return new CipherInputStream(fis, initDecryptCipher());
        }
        return fis;
    }

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

    public Map<String, Object> getEncryptionStatus() {
        return Map.of(
                "enabled", encryptionEnabled,
                "algorithm", encryptionEnabled ? "AES-256-GCM" : "NONE",
                "keySource", resolveKeySource(),
                "storagePath", storageLocation.toString());
    }

    private Cipher initEncryptCipher() throws Exception {
        byte[] iv = new byte[GCM_IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, spec);
        return cipher;
    }

    private Cipher initDecryptCipher() throws Exception {
        byte[] iv = new byte[GCM_IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey, spec);
        return cipher;
    }

    private SecretKey resolveEncryptionKey(String base64Key) {
        if (base64Key != null && !base64Key.isBlank()) {
            try {
                byte[] decoded = java.util.Base64.getDecoder().decode(base64Key);
                if (decoded.length == 32) {
                    return new SecretKeySpec(decoded, "AES");
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid base64 encryption key, deriving from password");
            }
        }

        String envKey = System.getenv("KMS_ENCRYPTION_KEY");
        if (envKey != null && !envKey.isBlank()) {
            try {
                byte[] decoded = java.util.Base64.getDecoder().decode(envKey);
                if (decoded.length == 32) {
                    return new SecretKeySpec(decoded, "AES");
                }
            } catch (IllegalArgumentException e) {
                // derive from passphrase
            }
            try {
                PBEKeySpec spec = new PBEKeySpec(envKey.toCharArray(), "kms-salt-v1".getBytes(), 65536, 256);
                SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
                byte[] keyBytes = factory.generateSecret(spec).getEncoded();
                return new SecretKeySpec(keyBytes, "AES");
            } catch (Exception e) {
                log.error("Failed to derive encryption key from env", e);
            }
        }

        log.warn("No encryption key configured; generating ephemeral key (data will NOT survive restart). "
                + "Set KMS_ENCRYPTION_KEY env var or kms.encryption.key property for persistence.");
        byte[] randomKey = new byte[32];
        new SecureRandom().nextBytes(randomKey);
        return new SecretKeySpec(randomKey, "AES");
    }

    private String resolveKeySource() {
        if (System.getenv("KMS_ENCRYPTION_KEY") != null) return "KMS_ENCRYPTION_KEY env var";
        return "ephemeral (restart-unsafe)";
    }

    private String sanitize(String originalFilename) {
        String name = (originalFilename == null || originalFilename.isBlank()) ? "document.bin" : originalFilename;
        return Paths.get(name).getFileName().toString().replaceAll("[\\\\/:*?\"<>|]", "_");
    }
}