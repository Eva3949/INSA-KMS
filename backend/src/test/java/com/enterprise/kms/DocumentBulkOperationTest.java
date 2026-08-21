package com.enterprise.kms;

import com.enterprise.kms.dto.BulkItemResult;
import com.enterprise.kms.dto.BulkOperationRequest;
import com.enterprise.kms.dto.BulkOperationResult;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

public class DocumentBulkOperationTest {

    @Test
    @DisplayName("Bulk Operation Result Accumulator Test")
    public void testBulkOperationResultAccumulation() {
        BulkOperationResult result = new BulkOperationResult();
        result.setOperation(BulkOperationRequest.OperationType.DELETE.name());

        UUID docId1 = UUID.randomUUID();
        UUID docId2 = UUID.randomUUID();

        result.addItemResult(new BulkItemResult(docId1, true, "Deleted successfully"));
        result.addItemResult(new BulkItemResult(docId2, false, "Permission denied"));

        Assertions.assertEquals(2, result.getTotalRequested());
        Assertions.assertEquals(1, result.getSuccessfulCount());
        Assertions.assertEquals(1, result.getFailedCount());
        Assertions.assertEquals("DELETE", result.getOperation());
    }

    @Test
    @DisplayName("Bulk Operation Request Instantiation Test")
    public void testBulkOperationRequestCreation() {
        BulkOperationRequest request = new BulkOperationRequest();
        request.setOperation(BulkOperationRequest.OperationType.MOVE);
        UUID folderId = UUID.randomUUID();
        request.setTargetFolderId(folderId);
        UUID docId = UUID.randomUUID();
        request.setDocumentIds(List.of(docId));

        Assertions.assertEquals(BulkOperationRequest.OperationType.MOVE, request.getOperation());
        Assertions.assertEquals(folderId, request.getTargetFolderId());
        Assertions.assertEquals(1, request.getDocumentIds().size());
    }
}
