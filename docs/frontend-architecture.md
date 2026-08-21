# KMS Complete Frontend Architecture Specification

## Overview

This document maps all 34 core screens defined in the KMS specification to Next.js App Router routes (`/app/...`), specifying their purpose, authorized roles, components, API dependencies, validation, loading/empty/error states, and mobile responsive behavior.

---

## 1. Information Architecture & App Router Directory Map

```
src/app/
├── (auth)/
│   └── login/
│       └── page.tsx                     --> Screen #1: Login
├── (dashboard)/
│   ├── layout.tsx                       --> Enterprise Shell (AppShell, TopHeader, Sidebar)
│   ├── page.tsx                         --> Screen #2: Dashboard
│   ├── library/
│   │   └── page.tsx                     --> Screen #3: Document Library
│   ├── folders/
│   │   └── [id]/page.tsx                --> Screen #4: Folder View
│   ├── search/
│   │   ├── page.tsx                     --> Screen #6: Advanced Search & Screen #7: Search Results
│   │   ├── saved/page.tsx               --> Screen #15: Saved Searches (Sub-view)
│   │   └── modal/page.tsx               --> Screen #5: Global Search Modal
│   ├── preview/
│   │   └── [id]/page.tsx                --> Screen #8: Document Preview & Screen #9: Details
│   ├── upload/
│   │   └── page.tsx                     --> Screen #10: Upload Document & Screen #11: Upload Progress
│   ├── versions/
│   │   └── [id]/page.tsx                --> Screen #12: Version History
│   ├── comments/
│   │   └── [id]/page.tsx                --> Screen #13: Comments / Annotations
│   ├── share/
│   │   └── [id]/page.tsx                --> Screen #14: Sharing Modal
│   ├── my-documents/page.tsx            --> Screen #15: My Documents
│   ├── shared-with-me/page.tsx          --> Screen #16: Shared With Me
│   ├── favorites/page.tsx               --> Screen #17: Favorites
│   ├── recent/page.tsx                  --> Screen #18: Recent Documents
│   ├── recycle-bin/page.tsx             --> Screen #19: Recycle Bin
│   ├── notifications/page.tsx           --> Screen #20: Notifications
│   ├── profile/page.tsx                 --> Screen #21: User Profile
│   ├── governance/
│   │   ├── retention/page.tsx           --> Screen #28: Retention Policies
│   │   ├── legal-holds/page.tsx         --> Screen #29: Legal Holds
│   │   └── audit-logs/page.tsx          --> Screen #32: Security Audit Logs
│   └── admin/
│       ├── page.tsx                     --> Screen #22: Administration Dashboard
│       ├── users/page.tsx               --> Screen #23: Users & Groups
│       ├── roles/page.tsx               --> Screen #24: Roles & Permissions
│       ├── departments/page.tsx         --> Screen #25: Departments
│       ├── document-types/page.tsx      --> Screen #26: Document Types
│       ├── taxonomy/page.tsx            --> Screen #27: Taxonomy / Tags
│       ├── storage/page.tsx             --> Screen #30: Storage Management
│       ├── reports/page.tsx             --> Screen #31: Usage Reports
│       ├── security/page.tsx            --> Screen #33: Security Monitoring
│       └── settings/page.tsx            --> Screen #34: System Settings
```

---

## 2. Exhaustive Specification for Core Screens

### Screen #1: Login (`/login`)
- **Purpose**: Authenticate user via Keycloak OIDC PKCE flow.
- **Roles**: All Users (Public state).
- **Components**: `LoginForm`, `KeycloakSsoButton`, `MfaChallengeModal`.
- **API Dependencies**: `/oauth2/authorization/keycloak`.
- **Entities**: `users`.
- **Actions**: Trigger SSO redirect, submit fallback credentials, input MFA TOTP code.
- **States**: Loading spinner on redirect; Error toast on invalid credentials/MFA timeout.
- **Mobile**: Single-column vertical layout centered vertically.

### Screen #2: Dashboard (`/`)
- **Purpose**: Executive workspace overview, quick search, recent activity, storage widget.
- **Roles**: All Authenticated Roles (`ROLE_VIEWER`+).
- **Components**: `ActivityOverviewCard`, `RecentFilesWidget`, `PendingApprovalsCard`, `StorageQuotaBanner`.
- **API Dependencies**: `GET /api/v1/users/me`, `GET /api/v1/documents?limit=5`, `GET /api/v1/reports/storage`.
- **Entities**: `documents`, `audit_logs`, `departments`.
- **Actions**: Click quick action shortcuts, jump to recent files.
- **Mobile**: Grid stacks into single-column vertical cards.

### Screen #3: Document Library (`/library`)
- **Purpose**: Primary document workspace for browsing, sorting, and managing files.
- **Roles**: All Authenticated Roles (`ROLE_VIEWER`+).
- **Components**: `Table`, `Badge`, `FilterToolbar`, `MetadataInspectorDrawer`, `BulkActionBar`.
- **API Dependencies**: `GET /api/v1/documents`, `POST /api/v1/documents/bulk-delete`.
- **Entities**: `documents`, `document_versions`, `departments`, `tags`.
- **Actions**: Select rows, trigger bulk operations, sort columns, open metadata side drawer.
- **Validation**: Selection payload validated before bulk execution.
- **States**: Skeleton rows during fetch; Empty state with "Upload Document" CTA when folder is empty; Toast on error.
- **Mobile**: Responsive table converts to stacked file cards; Metadata drawer slides up from bottom.

### Screen #8: Document Preview (`/preview/[id]`)
- **Purpose**: High-performance in-browser rendering of PDF, images, text, and office previews.
- **Roles**: `ROLE_VIEWER`+.
- **Components**: `PdfCanvasViewer`, `AnnotationLayer`, `PageNavigationToolbar`, `RightMetadataPanel`.
- **API Dependencies**: `GET /api/v1/documents/:id/preview`, `GET /api/v1/documents/:id/comments`.
- **Entities**: `documents`, `document_versions`, `storage_objects`, `document_comments`.
- **Actions**: Zoom, page jump, download binary, post line comment, request approval.
- **Mobile**: Preview canvas takes full screen width; Metadata drawer accessible via floating action button.

### Screen #32: Audit Logs (`/governance/audit-logs`)
- **Purpose**: Searchable, filterable security audit log table for compliance and investigation.
- **Roles**: `ROLE_IT_SECURITY`, `ROLE_ADMIN`.
- **Components**: `AuditFilterBar`, `AuditLogTable`, `AuditDetailModal`, `ExportCsvButton`.
- **API Dependencies**: `GET /api/v1/governance/audit-logs`.
- **Entities**: `audit_logs`.
- **Actions**: Filter by User ID, Action Type, Date Range; Export CSV; Inspect payload JSON.
- **Mobile**: Table displays condensed columns (User, Action, Timestamp) with expandable detail drawer.
