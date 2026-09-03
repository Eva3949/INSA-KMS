package com.enterprise.kms.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Summary result of a bulk document upload operation containing total counts and per-file outcomes.
 */
public class BulkUploadResult {
    private int totalFiles;
    private int successfulCount;
    private int failedCount;
    private List<BulkUploadItemResult> items = new ArrayList<>();

    public BulkUploadResult() {}

    public int getTotalFiles() {
        return totalFiles;
    }

    public void setTotalFiles(int totalFiles) {
        this.totalFiles = totalFiles;
    }

    public int getSuccessfulCount() {
        return successfulCount;
    }

    public void setSuccessfulCount(int successfulCount) {
        this.successfulCount = successfulCount;
    }

    public int getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(int failedCount) {
        this.failedCount = failedCount;
    }

    public List<BulkUploadItemResult> getItems() {
        return items;
    }

    public void setItems(List<BulkUploadItemResult> items) {
        this.items = items;
    }

    public void addItem(BulkUploadItemResult item) {
        this.items.add(item);
        if (item.isSuccess()) {
            this.successfulCount++;
        } else {
            this.failedCount++;
        }
        this.totalFiles = this.items.size();
    }
}
