package com.enterprise.kms.service;

import com.enterprise.kms.entity.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class MicrosoftGraphService {

    private final DocumentService documentService;

    @Value("${ms.graph.enabled:true}")
    private boolean enabled = true;

    @Value("${ms.graph.client-id:00000000-0000-0000-0000-000000000000}")
    private String clientId = "00000000-0000-0000-0000-000000000000";

    @Value("${ms.graph.client-secret:ms-graph-secret-placeholder}")
    private String clientSecret = "ms-graph-secret-placeholder";

    @Value("${ms.graph.tenant-id:common}")
    private String tenantId = "common";

    public MicrosoftGraphService(DocumentService documentService) {
        this.documentService = documentService;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isConfigured() {
        return enabled && !"00000000-0000-0000-0000-000000000000".equals(clientId) && !"ms-graph-secret-placeholder".equals(clientSecret);
    }

    public Map<String, Object> getGraphHealthStatus() {
        Map<String, Object> health = new HashMap<>();
        health.put("enabled", enabled);
        health.put("configured", isConfigured());
        health.put("status", !enabled ? "DISABLED" : (isConfigured() ? "HEALTHY" : "CONFIGURATION_REQUIRED"));
        health.put("tenantId", tenantId);
        return health;
    }

    public Map<String, Object> getGraphIntegrationDetails(UUID documentId) {
        if (documentId == null) {
            throw new IllegalArgumentException("Document ID cannot be null.");
        }

        Document doc = documentService.getDocumentById(documentId);
        String fileName = doc.getCurrentVersion() != null ? doc.getCurrentVersion().getFileName() : "document.docx";

        Map<String, Object> details = new HashMap<>();
        details.put("documentId", documentId.toString());
        details.put("fileName", fileName);
        details.put("graphTenantId", tenantId);
        details.put("graphClientId", clientId);
        details.put("graphEnabled", enabled);
        details.put("graphConfigured", isConfigured());
        details.put("graphEndpoint", "https://graph.microsoft.com/v1.0/sites/root/drive/items");
        details.put("tokenEndpoint", "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token");
        details.put("webdavSyncUrl", "http://localhost:8081/api/v1/documents/" + documentId + "/webdav-sync");
        details.put("protocolLauncherUri", "ms-word:ofe|u|http://localhost:8081/api/v1/documents/" + documentId + "/download");
        details.put("status", "GRAPH_INTEGRATION_READY");
        return details;
    }

    public String acquireGraphAccessToken() {
        if (!enabled) {
            throw new IllegalStateException("Microsoft Graph integration is disabled.");
        }
        if (!isConfigured()) {
            return "mock-ms-graph-access-token-placeholder";
        }
        return "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token";
    }

    public Document handleOfficeSaveBackSync(UUID documentId, MultipartFile updatedFile, String authorUsername, String changeSummary) {
        if (documentId == null) {
            throw new IllegalArgumentException("Document ID cannot be null for WebDAV sync.");
        }
        if (updatedFile == null || updatedFile.isEmpty()) {
            throw new IllegalArgumentException("Updated file payload cannot be empty.");
        }

        String summary = changeSummary != null ? changeSummary : "Automatic Office save-back revision via WebDAV/Graph API";
        return documentService.createDesktopCheckInVersion(documentId, updatedFile, summary, authorUsername);
    }
}
