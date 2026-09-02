package com.enterprise.kms.dto;

import java.util.UUID;

/**
 * Result representing the outcome of an individual file in a bulk upload batch.
 */
public class BulkUploadItemResult {
    private String fileName;
    private boolean success;
    private UUID documentId;
    private String title;
    private String message;
    private Long fileSizeBytes;

    public BulkUploadItemResult() {}

    public BulkUploadItemResult(String fileName, boolean success, UUID documentId, String title, String message, Long fileSizeBytes) {
        this.fileName = fileName;
        this.success = success;
        this.documentId = documentId;
        this.title = title;
        this.message = message;
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
}
