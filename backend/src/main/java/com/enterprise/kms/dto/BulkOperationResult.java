package com.enterprise.kms.dto;

import java.util.ArrayList;
import java.util.List;

public class BulkOperationResult {
    private String operation;
    private int totalRequested;
    private int successfulCount;
    private int failedCount;
    private List<BulkItemResult> itemResults = new ArrayList<>();

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public int getTotalRequested() {
        return totalRequested;
    }

    public void setTotalRequested(int totalRequested) {
        this.totalRequested = totalRequested;
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

    public List<BulkItemResult> getItemResults() {
        return itemResults;
    }

    public void setItemResults(List<BulkItemResult> itemResults) {
        this.itemResults = itemResults;
    }

    public void addItemResult(BulkItemResult result) {
        this.itemResults.add(result);
        if (result.isSuccess()) {
            this.successfulCount++;
        } else {
            this.failedCount++;
        }
        this.totalRequested = this.itemResults.size();
    }
}
