# KMS Complete REST API Architecture Specification

## Overview

This document specifies the complete REST API architecture for the Knowledge Management System (KMS), providing full end-to-end functional coverage for all 31 Functional Requirements (FR-01 $\rightarrow$ FR-31), 7 Business Requirements (BR-01 $\rightarrow$ BR-07), 10 Non-Functional Requirements, and all 35 Database Entities.

All endpoints require a valid OAuth2 JWT Bearer token issued by Keycloak unless explicitly annotated as a public endpoint.

---

## 1. Authentication & User Profile (`/api/v1/users`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Fetch authenticated user profile, roles, and department context. | Header: `Authorization: Bearer <jwt>` | `UserProfileResponse` | Any Authenticated | Valid JWT Token | `VIEW_SELF_PROFILE` | `users`, `departments`, `roles` |
| `GET` | `/api/v1/users/me/sessions` | List active Keycloak login sessions for current user. | None | `List<UserSessionResponse>` | Any Authenticated | Valid JWT Token | `VIEW_SESSIONS` | `users` |

---

## 2. Document & Folder Workspace (`/api/v1/folders`, `/api/v1/documents`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/folders/:id` | Fetch folder contents, breadcrumbs, subfolders, and child files. | Path: `id` (UUID) | `FolderContentsResponse` | `ROLE_VIEWER`+ | Folder `VIEW` ACL check | `FOLDER_VIEW` | `folders`, `folder_permissions`, `documents` |
| `POST` | `/api/v1/folders` | Create a new directory folder. | Body: `CreateFolderRequest` | `FolderDetailResponse` | `ROLE_CONTRIBUTOR`+ | Parent Folder `EDIT` ACL | `FOLDER_CREATE` | `folders`, `departments` |
| `POST` | `/api/v1/documents/upload` | Multipart upload binary file and metadata registration. | Multipart: `file`, `metadata_json` | `DocumentDetailResponse` | `ROLE_CONTRIBUTOR`+ | Target Folder `EDIT` ACL | `DOCUMENT_UPLOAD` | `documents`, `document_versions`, `storage_objects`, `file_checksums`, `ocr_jobs` |
| `GET` | `/api/v1/documents/:id` | Fetch document details, current version, and tags. | Path: `id` (UUID) | `DocumentDetailResponse` | `ROLE_VIEWER`+ | Document `VIEW` ACL + ABAC Label | `DOCUMENT_VIEW` | `documents`, `document_versions`, `document_types`, `document_tags` |
| `GET` | `/api/v1/documents/:id/download` | Stream binary file download or return signed URL. | Path: `id` (UUID) | File Stream / `DownloadUrlResponse` | `ROLE_VIEWER`+ | Document `VIEW` ACL + ABAC Label | `DOCUMENT_DOWNLOAD` | `documents`, `document_versions`, `storage_objects` |
| `GET` | `/api/v1/documents/:id/preview` | Render in-browser preview stream (PDF/Image/Text). | Path: `id` (UUID), Param: `page` | Preview Stream (application/pdf) | `ROLE_VIEWER`+ | Document `VIEW` ACL + ABAC Label | `DOCUMENT_PREVIEW` | `documents`, `document_versions`, `storage_objects` |
| `PUT` | `/api/v1/documents/:id/metadata` | Update custom metadata fields or confidentiality classification label. | Body: `UpdateMetadataRequest` | `DocumentDetailResponse` | `ROLE_CONTRIBUTOR`+ | Document `EDIT` ACL | `METADATA_UPDATE` | `documents`, `document_metadata` |
| `DELETE` | `/api/v1/documents/:id` | Soft-delete document to Recycle Bin. | Path: `id` (UUID) | `StatusResponse` | `ROLE_CONTRIBUTOR`+ | Document `DELETE` ACL / Owner | `DOCUMENT_DELETE` | `documents(is_deleted=TRUE)` |

---

## 3. Versioning & Check-in / Check-out (`/api/v1/documents/:id/...`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents/:id/versions` | List complete revision history for a document. | Path: `id` (UUID) | `List<VersionResponse>` | `ROLE_VIEWER`+ | Document `VIEW` ACL | `VERSION_HISTORY_VIEW` | `document_versions`, `users` |
| `POST` | `/api/v1/documents/:id/checkout` | Lock document exclusively for editing. | Path: `id` (UUID) | `LockResponse` | `ROLE_CONTRIBUTOR`+ | Document `EDIT` ACL | `CHECKOUT` | `document_locks` |
| `POST` | `/api/v1/documents/:id/checkin` | Upload new revision version and release lock. | Multipart: `file`, `change_summary` | `VersionResponse` | `ROLE_CONTRIBUTOR`+ | Must hold lock | `CHECKIN`, `VERSION_CREATE` | `document_versions`, `document_locks`, `storage_objects`, `ocr_jobs` |
| `POST` | `/api/v1/documents/:id/rollback` | Rollback document to a target version number. | Body: `RollbackRequest` | `DocumentDetailResponse` | `ROLE_CONTENT_OWNER`+ | Document `ADMIN` ACL | `VERSION_ROLLBACK` | `documents`, `document_versions` |

---

## 4. Search, Saved Searches & Alerts (`/api/v1/search`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/search/quick` | Global search autocomplete popover suggestions. | Param: `q` (string) | `QuickSearchResponse` | `ROLE_VIEWER`+ | Permission-aware FTS filter | `SEARCH_QUICK` | `document_versions`, `documents` |
| `POST` | `/api/v1/search/advanced` | Execute complex faceted full-text search query. | Body: `AdvancedSearchRequest` | `FacetedSearchResponse` | `ROLE_VIEWER`+ | Permission-aware FTS filter | `SEARCH_ADVANCED` | `document_versions`, `documents`, `tags`, `departments`, `document_types` |
| `GET` | `/api/v1/search/saved` | List saved search queries for logged-in user. | None | `List<SavedSearchResponse>` | `ROLE_VIEWER`+ | User-scoped query | `SAVED_SEARCH_LIST` | `saved_searches` |
| `POST` | `/api/v1/search/saved` | Save search query and configure alert notifications. | Body: `CreateSavedSearchRequest` | `SavedSearchResponse` | `ROLE_VIEWER`+ | User-scoped rule | `SAVED_SEARCH_CREATE` | `saved_searches`, `search_alerts` |

---

## 5. Collaboration, Comments & Sharing (`/api/v1/documents/:id/...`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents/:id/comments` | List discussion thread comments. | Path: `id` (UUID) | `List<CommentResponse>` | `ROLE_VIEWER`+ | Document `VIEW` ACL | `COMMENT_VIEW` | `document_comments`, `users` |
| `POST` | `/api/v1/documents/:id/comments` | Post a new comment or threaded reply. | Body: `CreateCommentRequest` | `CommentResponse` | `ROLE_VIEWER`+ | Document `VIEW` ACL | `COMMENT_CREATE` | `document_comments`, `notifications` |
| `POST` | `/api/v1/documents/:id/annotations` | Create page-coordinate visual highlight note. | Body: `CreateAnnotationRequest` | `AnnotationResponse` | `ROLE_CONTRIBUTOR`+ | Document `EDIT` ACL | `ANNOTATION_CREATE` | `document_annotations` |
| `POST` | `/api/v1/documents/:id/shares` | Create secure user share grant or expiring share link. | Body: `CreateShareRequest` | `ShareResponse` | `ROLE_CONTRIBUTOR`+ | Document `EDIT` ACL | `SHARE_LINK_CREATE` | `document_shares`, `share_links` |
| `GET` | `/api/v1/shares/:token` | Public endpoint to access shared link (requires password). | Path: `token`, Param: `password` | `SharedDocumentResponse` | Public | Token Hash & Password Check | `SHARE_LINK_ACCESS` | `share_links`, `documents`, `document_versions` |

---

## 6. Workflows & Document Approvals (`/api/v1/workflows`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/workflows/submit` | Submit document into an approval workflow route. | Body: `SubmitWorkflowRequest` | `WorkflowDetailResponse` | `ROLE_CONTRIBUTOR`+ | Document `EDIT` ACL | `WORKFLOW_SUBMIT` | `approval_workflows`, `approval_steps`, `documents(status='UNDER_REVIEW')` |
| `POST` | `/api/v1/workflows/:id/approve` | Approve or reject a workflow step. | Body: `ApproveStepRequest` | `WorkflowDetailResponse` | `ROLE_CONTENT_OWNER`+ | Assigned Approver check | `WORKFLOW_APPROVE`, `WORKFLOW_REJECT` | `approval_steps`, `document_approvals`, `documents(status='PUBLISHED')` |

---

## 7. Governance, Retention & Legal Holds (`/api/v1/governance/...`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/governance/retention` | List active retention policy schedules and rules. | None | `List<RetentionPolicyResponse>` | `ROLE_COMPLIANCE_OFFICER`+ | Compliance Officer check | `RETENTION_VIEW` | `retention_policies`, `retention_rules` |
| `POST` | `/api/v1/governance/retention` | Create or update retention disposition policy and rules. | Body: `CreateRetentionPolicyRequest` | `RetentionPolicyResponse` | `ROLE_COMPLIANCE_OFFICER`+ | Compliance Officer check | `RETENTION_POLICY_UPDATE` | `retention_policies`, `retention_rules` |
| `POST` | `/api/v1/governance/legal-holds` | Apply litigation hold to freeze documents. | Body: `CreateLegalHoldRequest` | `LegalHoldResponse` | `ROLE_COMPLIANCE_OFFICER`+ | Compliance Officer check | `LEGAL_HOLD_APPLY` | `legal_holds`, `legal_hold_items` |
| `DELETE` | `/api/v1/governance/legal-holds/:id` | Lift legal hold from document set. | Path: `id` (UUID) | `StatusResponse` | `ROLE_COMPLIANCE_OFFICER`+ | Compliance Officer check | `LEGAL_HOLD_RELEASE` | `legal_holds`, `legal_hold_items` |
| `GET` | `/api/v1/governance/audit-logs` | Query security audit log records with multi-field filters. | Params: `user`, `action`, `startDate`, `endDate` | `AuditLogPageResponse` | `ROLE_IT_SECURITY`, `ROLE_ADMIN` | IT Security / Admin check | `AUDIT_LOG_QUERY` | `audit_logs` |

---

## 8. Administration, Storage & OCR (`/api/v1/admin/...`)

| Method | Endpoint URL | Purpose | Request Body / Params | Response Model | Required Role | Permission Check | Audit Event | Database Entities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/summary` | Executive system health metrics, storage, and OCR queue backlog. | None | `AdminSummaryResponse` | `ROLE_ADMIN` | Admin Role check | `ADMIN_SUMMARY_VIEW` | `system_settings`, `departments`, `ocr_jobs` |
| `GET` | `/api/v1/admin/storage/quotas` | Department storage quota allocation and consumption reports. | None | `List<DepartmentStorageResponse>` | `ROLE_ADMIN` | Admin Role check | `STORAGE_REPORT_VIEW` | `departments`, `storage_objects` |
| `GET` | `/api/v1/admin/ocr/status` | Monitor background OCR text extraction processing queue. | None | `List<OcrJobResponse>` | `ROLE_ADMIN` | Admin Role check | `OCR_STATUS_VIEW` | `ocr_jobs`, `document_versions` |
| `PUT` | `/api/v1/admin/settings` | Update global platform configuration settings. | Body: `UpdateSettingsRequest` | `SettingsResponse` | `ROLE_ADMIN` | Admin Role check | `ADMIN_SETTINGS_UPDATE` | `system_settings` |
