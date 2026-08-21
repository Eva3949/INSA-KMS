package com.enterprise.kms;

import com.enterprise.kms.entity.Document;
import com.enterprise.kms.service.DocumentService;
import com.enterprise.kms.service.MicrosoftGraphService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Map;
import java.util.UUID;

public class MicrosoftGraphIntegrationTest {

    @Test
    @DisplayName("Microsoft Graph Token Acquisition & Details Test")
    public void testGraphTokenAcquisitionAndDetails() {
        DocumentService documentService = Mockito.mock(DocumentService.class);
        UUID docId = UUID.randomUUID();
        Document mockDoc = new Document();
        mockDoc.setTitle("SecurityArchitecture.docx");
        Mockito.when(documentService.getDocumentById(docId)).thenReturn(mockDoc);

        MicrosoftGraphService graphService = new MicrosoftGraphService(documentService);
        Map<String, Object> details = graphService.getGraphIntegrationDetails(docId);

        Assertions.assertNotNull(details);
        Assertions.assertEquals(docId.toString(), details.get("documentId"));
        Assertions.assertEquals("GRAPH_INTEGRATION_READY", details.get("status"));
        Assertions.assertNotNull(graphService.acquireGraphAccessToken());
    }

    @Test
    @DisplayName("WebDAV Sync Payload Validation Rejection Test")
    public void testWebDavEmptyPayloadRejection() {
        DocumentService documentService = Mockito.mock(DocumentService.class);
        MicrosoftGraphService graphService = new MicrosoftGraphService(documentService);

        MockMultipartFile emptyFile = new MockMultipartFile("file", "", "text/plain", new byte[0]);
        UUID docId = UUID.randomUUID();

        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            graphService.handleOfficeSaveBackSync(docId, emptyFile, "contributor", "Empty save-back");
        });
    }

    @Test
    @DisplayName("WebDAV Sync Null Document ID Rejection Test")
    public void testWebDavNullDocumentIdRejection() {
        DocumentService documentService = Mockito.mock(DocumentService.class);
        MicrosoftGraphService graphService = new MicrosoftGraphService(documentService);

        MockMultipartFile validFile = new MockMultipartFile("file", "test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content".getBytes());

        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            graphService.handleOfficeSaveBackSync(null, validFile, "contributor", "Null ID");
        });
    }
}
