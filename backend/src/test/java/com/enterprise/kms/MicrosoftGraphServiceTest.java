package com.enterprise.kms;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.MicrosoftGraphService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;
import java.util.UUID;

public class MicrosoftGraphServiceTest {

    @Test
    @DisplayName("Microsoft Graph Details Generator Test")
    public void testGetGraphIntegrationDetails() {
        DocumentService documentService = Mockito.mock(DocumentService.class);
        UUID docId = UUID.randomUUID();
        Document mockDoc = new Document();
        mockDoc.setTitle("TestDocument.docx");
        Mockito.when(documentService.getDocumentById(docId)).thenReturn(mockDoc);

        MicrosoftGraphService graphService = new MicrosoftGraphService(documentService);
        Map<String, Object> details = graphService.getGraphIntegrationDetails(docId);

        Assertions.assertNotNull(details);
        Assertions.assertEquals(docId.toString(), details.get("documentId"));
        Assertions.assertEquals("GRAPH_INTEGRATION_READY", details.get("status"));
        Assertions.assertTrue(details.containsKey("webdavSyncUrl"));
    }
}
