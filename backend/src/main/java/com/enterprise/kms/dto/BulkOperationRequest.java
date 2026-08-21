package com.enterprise.kms.dto;

import java.util.List;
import java.util.UUID;

public class BulkOperationRequest {
    public enum OperationType {
        MOVE,
        TAG,
        DELETE,
        UPDATE_PERMISSION
    }

    private OperationType operation;
    private List<UUID> documentIds;
    private UUID targetFolderId;
    private List<String> tags;
    private String confidentialityLevel;

    public OperationType getOperation() {
        return operation;
    }

    public void setOperation(OperationType operation) {
        this.operation = operation;
    }

    public List<UUID> getDocumentIds() {
        return documentIds;
    }

    public void setDocumentIds(List<UUID> documentIds) {
        this.documentIds = documentIds;
    }

    public UUID getTargetFolderId() {
        return targetFolderId;
    }

    public void setTargetFolderId(UUID targetFolderId) {
        this.targetFolderId = targetFolderId;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getConfidentialityLevel() {
        return confidentialityLevel;
    }

    public void setConfidentialityLevel(String confidentialityLevel) {
        this.confidentialityLevel = confidentialityLevel;
    }
}
