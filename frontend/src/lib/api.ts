const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach Keycloak Bearer token if present in session storage / local storage
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('kms_access_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // On 401, clear auth state so AuthProvider picks it up on the next cycle.
    // Do NOT hard-redirect here — AuthProvider handles the redirect cleanly
    // and avoids competing redirects that cause login loops.
    if (response.status === 401 && typeof window !== 'undefined') {
      sessionStorage.removeItem('kms_access_token');
      sessionStorage.removeItem('kms_refresh_token');
      document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText || response.statusText}`);
  }

  // Return empty response for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const kmsApi = {
  // Health
  getHealthStatus: () => fetchApi<{ status: string; service: string }>('/health'),

  // Users Profile
  getCurrentUser: () => fetchApi<{ id?: string; username: string; email: string; fullName: string; department?: string; roles: string[] }>('/users/me'),
  getMyApprovals: () => fetchApi<any[]>('/users/me/approvals'),

  // Documents
  documents: {
    list: (page = 0, size = 10) => fetchApi<any>(`/documents?page=${page}&size=${size}`),
    mine: (page = 0, size = 20) => fetchApi<any>(`/documents/mine?page=${page}&size=${size}`),
    recent: (limit = 20) => fetchApi<any[]>(`/documents/recent?limit=${limit}`),
    recycleBin: () => fetchApi<any[]>(`/documents/recycle-bin?page=0&size=100`),
    getMetadata: (id: string) => fetchApi<any>(`/documents/${id}/metadata`),
    putMetadata: (id: string, values: Record<string, string>) =>
      fetchApi<any>(`/documents/${id}/metadata`, { method: 'PUT', body: JSON.stringify(values) }),
    getById: (id: string) => fetchApi<any>(`/documents/${id}`),
    upload: async (formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Upload failed [${res.status}]: ${errText || res.statusText || 'Server Error'}`);
      }
      return res.json();
    },
    bulk: (payload: { operation: string; documentIds: string[]; targetFolderId?: string; tags?: string[]; confidentialityLevel?: string }) => fetchApi<any>('/documents/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    desktopOpen: (id: string) => fetchApi<{ documentId: string; fileName: string; desktopUri: string; supportedApp: string; webdavRequirementNote: string }>(`/documents/${id}/desktop-open`),
    desktopCheckIn: async (id: string, formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/documents/${id}/desktop-checkin`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error(`Desktop check-in failed: ${res.statusText}`);
      return res.json();
    },
    delete: (id: string) => fetchApi<void>(`/documents/${id}`, { method: 'DELETE' }),
    restore: (id: string) => fetchApi<void>(`/documents/${id}/restore`, { method: 'POST' }),
    getVersions: (id: string) => fetchApi<any[]>(`/documents/${id}/versions`),
    downloadUrl: (id: string, disposition: 'inline' | 'attachment' = 'attachment') =>
      `${API_BASE_URL}/documents/${id}/download?disposition=${disposition}`,
    downloadBlob: async (id: string, disposition: 'inline' | 'attachment' = 'attachment') => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const res = await fetch(`${API_BASE_URL}/documents/${id}/download?disposition=${disposition}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const text = await res.text();
          detail = JSON.parse(text)?.message || text || detail;
        } catch {
          /* keep statusText */
        }
        throw new Error(`Preview/download failed [${res.status}]: ${detail}`);
      }
      return res.blob();
    },
    getComments: (id: string) => fetchApi<any[]>(`/documents/${id}/comments`),
    addComment: (id: string, text: string) => fetchApi<any>(`/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    }),
    getFavoriteStatus: (id: string) => fetchApi<{ favorited: boolean }>(`/documents/${id}/favorite/status`),
    toggleFavorite: (id: string) => fetchApi<{ favorited: boolean }>(`/documents/${id}/favorite/toggle`, { method: 'POST' }),
    getFavorites: () => fetchApi<any[]>('/documents/favorites'),
    getSharedWithMe: () => fetchApi<any[]>('/documents/shared-with-me'),
    getLockStatus: (id: string) => fetchApi<any>(`/documents/${id}/lock-status`),
    checkout: (id: string) => fetchApi<any>(`/documents/${id}/checkout`, { method: 'POST' }),
    checkin: async (id: string, formData: FormData) => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/documents/${id}/checkin`, { method: 'POST', headers, body: formData });
      if (!res.ok) throw new Error(`Check-in failed: ${res.statusText}`);
      return res.json();
    },
    unlock: (id: string) => fetchApi<any>(`/documents/${id}/unlock`, { method: 'POST' }),
    getShareLinks: (id: string) => fetchApi<any[]>(`/documents/${id}/share-links`),
    createShareLink: (id: string, payload: { expiryHours?: number; password?: string }) =>
      fetchApi<any>(`/documents/${id}/share-link`, { method: 'POST', body: JSON.stringify(payload) }),
  },

  // Folders
  folders: {
    list: () => fetchApi<any[]>('/folders'),
    getById: (id: string) => fetchApi<any>(`/folders/${id}`),
    create: (payload: { name: string; parentId?: string; departmentId?: string; confidentialityLevel?: string }) =>
      fetchApi<any>('/folders', { method: 'POST', body: JSON.stringify(payload) }),
  },

  // FR-17 Access control (folder + document ACLs)
  permissions: {
    getSubjects: () => fetchApi<{
      users: Array<{ id: string; label: string; active: boolean }>;
      groups: Array<{ id: string; label: string }>;
      roles: string[];
      permissionLevels: string[];
    }>('/permissions/subjects'),
    listFolder: (folderId: string) => fetchApi<any[]>(`/folders/${folderId}/permissions`),
    grantFolder: (folderId: string, payload: { subjectType: string; subjectId: string; permissionLevel: string }) =>
      fetchApi<any>(`/folders/${folderId}/permissions`, { method: 'POST', body: JSON.stringify(payload) }),
    revokeFolder: (folderId: string, permissionId: string) =>
      fetchApi<void>(`/folders/${folderId}/permissions/${permissionId}`, { method: 'DELETE' }),
    listDocument: (documentId: string) => fetchApi<any[]>(`/documents/${documentId}/permissions`),
    grantDocument: (documentId: string, payload: { subjectType: string; subjectId: string; permissionLevel: string }) =>
      fetchApi<any>(`/documents/${documentId}/permissions`, { method: 'POST', body: JSON.stringify(payload) }),
    revokeDocument: (documentId: string, permissionId: string) =>
      fetchApi<void>(`/documents/${documentId}/permissions/${permissionId}`, { method: 'DELETE' }),
  },

  // Search
  search: {
    quick: (query: string) => fetchApi<any>(`/search/quick?q=${encodeURIComponent(query)}`),
    advanced: (query: string) => fetchApi<any>(`/search/advanced`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  },

  // Governance & Compliance
  governance: {
    getRetentionPolicies: () => fetchApi<any[]>('/governance/retention'),
    createRetentionPolicy: (payload: { name: string; description?: string; documentTypeId?: string; retentionDays: number; dispositionAction?: string }) =>
      fetchApi<any>('/governance/retention', { method: 'POST', body: JSON.stringify(payload) }),
    updateRetentionPolicy: (id: string, payload: Record<string, unknown>) =>
      fetchApi<any>(`/governance/retention/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteRetentionPolicy: (id: string) => fetchApi<void>(`/governance/retention/${id}`, { method: 'DELETE' }),
    getLegalHolds: () => fetchApi<any[]>('/governance/legal-holds'),
    createLegalHold: (caseNumber: string, title: string, description: string) => fetchApi<any>('/governance/legal-holds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ caseNumber, title, description }).toString(),
    }),
    releaseLegalHold: (id: string) => fetchApi<any>(`/governance/legal-holds/${id}/release`, { method: 'PUT' }),
    getHoldItems: (id: string) => fetchApi<any[]>(`/governance/legal-holds/${id}/items`),
    addDocumentToHold: (id: string, documentId: string) => fetchApi<any>(`/governance/legal-holds/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),
    removeDocumentFromHold: (id: string, documentId: string) =>
      fetchApi<void>(`/governance/legal-holds/${id}/items/${documentId}`, { method: 'DELETE' }),
    getAuditLogs: (page = 0, size = 20) => fetchApi<any>(`/governance/audit-logs?page=${page}&size=${size}`),
    exportAuditLogsUrl: `${API_BASE_URL}/governance/audit-logs/export`,
  },

  // Administration
  admin: {
    getSummary: () => fetchApi<{ totalUsers: number; totalDocuments: number; storageQuotaUsedBytes: number }>('/admin/summary'),
    getUsers: () => fetchApi<any[]>('/admin/users'),
    createUser: (payload: { username: string; email: string; roleName: string; departmentId?: string; temporaryPassword?: string; firstName?: string; lastName?: string }) =>
      fetchApi<any>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
    resetUserPassword: (id: string, password: string, temporary = true) =>
      fetchApi<{ message: string; username: string }>(`/admin/users/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ password, temporary: String(temporary) }),
      }),
    getIdentityProviderHealth: () => fetchApi<{ enabled: boolean; baseUrl: string; realm: string; status: string; error?: string }>(
      '/admin/identity-provider/health'),
    updateUser: (id: string, payload: Record<string, string>) =>
      fetchApi<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    activateUser: (id: string) => fetchApi<any>(`/admin/users/${id}/activate`, { method: 'PUT' }),
    deactivateUser: (id: string) => fetchApi<any>(`/admin/users/${id}/deactivate`, { method: 'PUT' }),
    changeUserRole: (id: string, roleName: string) =>
      fetchApi<any>(`/admin/users/${id}/roles`, { method: 'PUT', body: JSON.stringify({ roleName }) }),
    deleteUser: (id: string) => fetchApi<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    searchUsers: (q: string) => fetchApi<any[]>(`/admin/users/search?q=${encodeURIComponent(q)}`),
    getRoles: () => fetchApi<Array<{ name: string; description: string; userCount: number }>>('/admin/roles'),

    // Departments & quotas (FR-27)
    getDepartments: () => fetchApi<any[]>('/admin/departments'),
    createDepartment: (payload: { name: string; code: string; storageQuotaBytes?: number }) =>
      fetchApi<any>('/admin/departments', { method: 'POST', body: JSON.stringify(payload) }),
    updateDepartment: (id: string, payload: { name?: string; code?: string; storageQuotaBytes?: number }) =>
      fetchApi<any>(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteDepartment: (id: string) => fetchApi<void>(`/admin/departments/${id}`, { method: 'DELETE' }),

    // Document types (FR-06)
    getDocumentTypes: () => fetchApi<any[]>('/admin/document-types'),
    listTypeFields: (typeId: string) => fetchApi<any[]>(`/admin/document-types/${typeId}/fields`),
    createTypeField: (typeId: string, payload: { fieldKey: string; label?: string; dataType?: string; required?: boolean }) =>
      fetchApi<any>(`/admin/document-types/${typeId}/fields`, { method: 'POST', body: JSON.stringify(payload) }),
    deleteTypeField: (typeId: string, fieldId: string) =>
      fetchApi<void>(`/admin/document-types/${typeId}/fields/${fieldId}`, { method: 'DELETE' }),

    // Approval workflow templates (FR-25)
    listApprovalTemplates: () => fetchApi<any[]>('/admin/approval-templates'),
    createApprovalTemplate: (payload: { name: string; description?: string; documentTypeId?: string; isActive?: boolean; approverIds: string[] }) =>
      fetchApi<any>('/admin/approval-templates', { method: 'POST', body: JSON.stringify(payload) }),
    updateApprovalTemplate: (id: string, payload: Record<string, unknown>) =>
      fetchApi<any>(`/admin/approval-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteApprovalTemplate: (id: string) => fetchApi<void>(`/admin/approval-templates/${id}`, { method: 'DELETE' }),

    createDocumentType: (payload: { name: string; description?: string }) =>
      fetchApi<any>('/admin/document-types', { method: 'POST', body: JSON.stringify(payload) }),
    updateDocumentType: (id: string, payload: { name?: string; description?: string }) =>
      fetchApi<any>(`/admin/document-types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteDocumentType: (id: string) => fetchApi<void>(`/admin/document-types/${id}`, { method: 'DELETE' }),

    // Taxonomy / tags (FR-03)
    getTags: () => fetchApi<any[]>('/admin/taxonomy/tags'),
    createTag: (payload: { name: string; category?: string }) =>
      fetchApi<any>('/admin/taxonomy/tags', { method: 'POST', body: JSON.stringify(payload) }),
    updateTag: (id: string, payload: { name?: string; category?: string }) =>
      fetchApi<any>(`/admin/taxonomy/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteTag: (id: string) => fetchApi<void>(`/admin/taxonomy/tags/${id}`, { method: 'DELETE' }),

    // Groups (FR-27)
    getGroups: () => fetchApi<any[]>('/admin/groups'),
    createGroup: (payload: { name: string; departmentId?: string }) =>
      fetchApi<any>('/admin/groups', { method: 'POST', body: JSON.stringify(payload) }),
    updateGroup: (id: string, payload: { name?: string; departmentId?: string }) =>
      fetchApi<any>(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteGroup: (id: string) => fetchApi<void>(`/admin/groups/${id}`, { method: 'DELETE' }),
    listGroupMembers: (id: string) => fetchApi<any[]>(`/admin/groups/${id}/members`),
    addGroupMember: (id: string, userId: string) =>
      fetchApi<void>(`/admin/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeGroupMember: (id: string, userId: string) =>
      fetchApi<void>(`/admin/groups/${id}/members/${userId}`, { method: 'DELETE' }),

    // System configuration (FR-27)
    getSettings: () => fetchApi<any[]>('/admin/settings'),
    updateSettings: (payload: Record<string, string>) =>
      fetchApi<any[]>('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),

    // Storage integrity
    getStorageStats: () => fetchApi<{
      totalObjects: number;
      totalBytes: number;
      orphanedObjects: number;
      duplicateChecksums: Array<{ checksumSha256: string; copies: number; wastedBytes: number }>;
    }>('/admin/storage/stats'),
    getStorageObjects: (limit = 50) => fetchApi<any[]>(`/admin/storage/objects?limit=${limit}`),

    // IT security monitoring (FR-22)
    getSecurityEvents: (page = 0, size = 25, filters?: { action?: string; user?: string; from?: string; to?: string }) => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (filters?.action) params.set('action', filters.action);
      if (filters?.user) params.set('user', filters.user);
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      return fetchApi<any>(`/admin/security/events?${params.toString()}`);
    },
    forwardToSiem: () => fetchApi<{ status: string; forwarded?: number; watermark?: string; hint?: string }>(
      '/admin/security/siem/forward', { method: 'POST' }),
    sendTestEmail: (to: string) =>
      fetchApi<{ status: string; detail?: string }>('/admin/mail/test', { method: 'POST', body: JSON.stringify({ to }) }),
    getBackupStatus: () => fetchApi<{
      databaseName: string;
      databaseSizePretty: string;
      databaseSizeBytes: number;
      documentCount: number;
      lastBackupAt: string;
      backupLocation: string;
      backupScript: string;
    }>('/admin/backup/status'),
    getOcrJobs: (limit = 50) => fetchApi<{ pendingCount: number; jobs: any[] }>(`/admin/ocr/jobs?limit=${limit}`),
    purgeRecycleBin: (days?: number) =>
      fetchApi<{ purged: number; skippedOnLegalHold: number; retentionDays: number }>(
        `/admin/recycle-bin/purge${days ? `?days=${days}` : ''}`, { method: 'POST' }),

    // Reports (FR-30 / FR-31)
    getStorageGrowthReport: (months = 12) => fetchApi<any>(`/admin/reports/storage-growth?months=${months}`),
    getActiveUsersReport: (days = 30, limit = 15) => fetchApi<any>(`/admin/reports/active-users?days=${days}&limit=${limit}`),
    getTopSearchesReport: (days = 30, limit = 10) => fetchApi<any>(`/admin/reports/top-searches?days=${days}&limit=${limit}`),
    getStaleContentReport: (days = 365, limit = 100) => fetchApi<any>(`/admin/reports/stale-content?days=${days}&limit=${limit}`),

    // Manual retention disposition run (FR-28)
    runRetentionDispositions: () => fetchApi<{ archived: number; purged: number; reviewFlagged: number; skippedOnLegalHold: number }>(
      '/admin/retention/run', { method: 'POST' }),

    // Approval workflow actions (FR-25)
    getPendingApprovals: () => fetchApi<any[]>('/admin/approvals/pending'),
    decideApproval: (workflowId: string, stepId: string, decision: string, comments?: string) =>
      fetchApi<any>(`/admin/approvals/${workflowId}/steps/${stepId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, comments }),
      }),
  },
};
