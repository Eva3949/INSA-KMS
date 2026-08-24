package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "storage_objects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class StorageObject {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "storage_path", nullable = false, unique = true, length = 500)
    private String storagePath;

    @Column(name = "checksum_sha256", nullable = false, unique = true, length = 64)
    private String checksumSha256;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }

    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
