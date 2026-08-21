package com.enterprise.kms.dto;

import java.util.UUID;

public class BulkItemResult {
    private UUID documentId;
    private boolean success;
    private String message;

    public BulkItemResult() {}

    public BulkItemResult(UUID documentId, boolean success, String message) {
        this.documentId = documentId;
        this.success = success;
        this.message = message;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
