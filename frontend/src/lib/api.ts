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
    if (response.status === 401 && typeof window !== 'undefined') {
      sessionStorage.removeItem('kms_access_token');
      sessionStorage.removeItem('kms_refresh_token');
      document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
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

  // Documents
  documents: {
    list: (page = 0, size = 10) => fetchApi<any>(`/documents?page=${page}&size=${size}`),
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
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
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
    getComments: (id: string) => fetchApi<any[]>(`/documents/${id}/comments`),
    addComment: (id: string, text: string) => fetchApi<any>(`/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    }),
  },

  // Folders
  folders: {
    getById: (id: string) => fetchApi<any>(`/folders/${id}`),
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
    getLegalHolds: () => fetchApi<any[]>('/governance/legal-holds'),
    createLegalHold: (caseNumber: string, title: string, description: string) => fetchApi<any>('/governance/legal-holds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ caseNumber, title, description }).toString(),
    }),
    getAuditLogs: (page = 0, size = 20) => fetchApi<any>(`/governance/audit-logs?page=${page}&size=${size}`),
  },

  // Administration
  admin: {
    getSummary: () => fetchApi<{ totalUsers: number; totalDocuments: number; storageQuotaUsedBytes: number }>('/admin/summary'),
    getUsers: () => fetchApi<any[]>('/admin/users'),
    getRoles: () => fetchApi<any[]>('/admin/roles'),
  },
};
