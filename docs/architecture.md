# KMS System Architecture Specification

## 1. System Overview

The Knowledge Management System (KMS) is an enterprise-grade document repository, search, collaboration, and governance platform. It provides a secure, single source of truth for internal documents and digital assets.

## 2. Core Architecture Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Browser / Mobile Web Client                       │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Frontend: Next.js (TypeScript / React)                    │
│  - App Router, Tailwind CSS Enterprise Tokens, Radix UI Primitives      │
│  - Document Workspace Shell, PDF.js Preview Canvas                      │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                             HTTPS / REST API (JWT)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            Backend: Spring Boot 3.x (Java 21 / Maven)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Spring Security (OAuth2 Resource Server / Keycloak JWT Validation)│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────┬─────────────────┬──────────────────┬──────────────┐  │
│  │ Document Svc  │ Version Svc     │ Search Svc (Tika)│ Audit Aspect │  │
│  ├───────────────┼─────────────────┼──────────────────┼──────────────┤  │
│  │ Workflow Svc  │ Retention Svc   │ Storage Svc      │ Security Svc │  │
│  └───────────────┴─────────────────┴──────────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
           │                         │                        │
           ▼                         ▼                        ▼
┌──────────────────┐      ┌──────────────────┐     ┌──────────────────┐
│     Keycloak     │      │    PostgreSQL    │     │ Object Storage / │
│ (OAuth2 / OIDC)  │      │   (Primary DB)   │     │ S3 / Apache Tika │
└──────────────────┘      └──────────────────┘     └──────────────────┘
```

## 3. Technology Stack Specification

- **Frontend**: Next.js 14+ (App Router), TypeScript, Modern React, Tailwind CSS, Radix UI primitives, Lucide React Icons.
- **Backend**: Spring Boot 3.3+ (Java 21, Maven), Spring Data JPA, Spring Validation, Spring AOP.
- **Security & Identity**: Keycloak (Identity Server / OIDC) + Spring Security (OAuth2 Resource Server JWT Validation).
- **Database**: PostgreSQL 15+ with Flyway migrations.
- **Storage Abstraction**: S3-compatible Object Storage / Local Filesystem with SHA-256 integrity verification.
- **Search & OCR**: Apache Tika text extraction background pipeline + PostgreSQL Full-Text Search (FTS).

## 4. Key Security & Compliance Rules

1. **No Fake Authentication**: All protected APIs validate Keycloak RS256 JWT signatures.
2. **Fine-Grained RBAC & ABAC**: Realm roles (`ROLE_ADMIN`, `ROLE_CONTENT_OWNER`, `ROLE_CONTRIBUTOR`, `ROLE_VIEWER`, `ROLE_COMPLIANCE_OFFICER`, `ROLE_IT_SECURITY`) combined with document classification labels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`).
3. **Auditability**: Every state-changing request is intercepted by Spring AOP (`@AuditLog`) to capture User ID, Username, Action, Resource, Resource ID, IP Address, User-Agent, and Timestamp.
4. **Data Integrity**: SHA-256 checksums recorded on every uploaded version to detect binary tampering.

---

## 5. Architectural Document Index

- [`docs/requirements-traceability.md`](file:///c:/Users/PC/Downloads/KMS/docs/requirements-traceability.md): Requirements Traceability Matrix for BR-01..07, FR-01..31, NFR-01..10.
- [`docs/database-architecture.md`](file:///c:/Users/PC/Downloads/KMS/docs/database-architecture.md): Complete PostgreSQL ERD and DDL schema.
- [`docs/api-architecture.md`](file:///c:/Users/PC/Downloads/KMS/docs/api-architecture.md): Complete REST API endpoints mapping.
- [`docs/frontend-architecture.md`](file:///c:/Users/PC/Downloads/KMS/docs/frontend-architecture.md): Next.js App Router 34-screen information architecture.
- [`docs/development-setup.md`](file:///c:/Users/PC/Downloads/KMS/docs/development-setup.md): Local environment setup guide.
- [`docs/keycloak-setup.md`](file:///c:/Users/PC/Downloads/KMS/docs/keycloak-setup.md): Keycloak realm and client configuration.
- [`docs/database.md`](file:///c:/Users/PC/Downloads/KMS/docs/database.md): Database migration guide.
