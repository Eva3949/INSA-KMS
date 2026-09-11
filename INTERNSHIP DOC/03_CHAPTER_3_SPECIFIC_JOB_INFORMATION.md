# CHAPTER 3: SPECIFIC JOB INFORMATION

---

## 3.1 Daily Technical Duties and Responsibilities

During the two-month internship tenure at the **Information Network Security Administration (INSA)**, my primary daily technical duty was the end-to-end engineering, hardening, integration, and empirical verification of the **Enterprise Knowledge Management System (INSA-KMS)**. This section provides an in-depth technical analysis of the problem context, system topology, core architectural subsystems, software engineering workflows, and empirical verification results.

### 3.1.1 Problem Statement and Context of INSA-KMS

As Ethiopia's central cybersecurity and technical intelligence agency, INSA processes vast volumes of highly classified and technically complex information daily. Across its directorates—such as EthioCERT, Cryptographic Engineering, Forensics, and Critical Information Infrastructure Protection (CIIP)—personnel continuously author threat intelligence bulletins, vulnerability assessments, penetration testing methodologies, software design blueprints, incident response playbooks, and regulatory frameworks.

Historically, this intellectual capital was stored in an uncoordinated, fragmented manner:
1. **Siloed Storage Repositories:** Documents were scattered across local employee hard drives, shared Windows network folders (SMB/CIFS), private cloud accounts, and email attachments. When specialized engineers were reassigned or exited the organization, critical operational knowledge was frequently lost or rendered inaccessible.
2. **Lack of Centralized Discovery:** Locating a specific cyber vulnerability whitepaper or historical incident report often required days of manual inquiries across different departments, resulting in significant duplication of complex analytical and reverse-engineering efforts.
3. **Absence of Unified Access Governance:** File access was governed by crude operating system file permissions rather than an enterprise-wide, fine-grained access control model. Enforcing national information clearance levels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) across digital files was technically infeasible under the legacy system.
4. **Security Risks and Lack of Auditability:** There was no cryptographically verifiable audit trail of who created, accessed, modified, downloaded, or shared classified documents. In the event of an internal security breach or data leak, forensic investigators had no reliable, centralized access log to examine.
5. **Disconnected Collaboration Channels:** Collaboration around sensitive technical documents took place over unencrypted or external communication tools, exposing confidential discussions to potential surveillance and data interception.

To eliminate these vulnerabilities, INSA initiated the **INSA-KMS** project. The mandate was to engineer an air-gapped, sovereign, enterprise-grade Knowledge Management System that acts as a single, governed, highly searchable, and tamper-evident source of truth for all internal organizational knowledge assets.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Browser / Mobile Web Client                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Frontend: Next.js (TypeScript / React 18)                 │
│  - App Router, Tailwind CSS Enterprise Tokens, Radix UI Primitives      │
│  - Document Workspace Shell, PDF.js Preview Canvas                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / REST API (Bearer JWT)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            Backend: Spring Boot 3.3 (Java 21 / Maven)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Spring Security (OAuth2 Resource Server / Keycloak JWT Validation)│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────┬─────────────────┬──────────────────┬──────────────┐  │
│  │ Document Svc  │ Version Svc     │ Search Svc (Tika)│ Audit Aspect │  │
│  ├───────────────┼─────────────────┼──────────────────┼──────────────┤  │
│  │ Workflow Svc  │ Retention Svc   │ Storage Svc      │ Security Svc │  │
│  └───────────────┴─────────────────┴──────────────────┴──────────────┘  │
└──────────────────┬─────────────────┬──────────────────┬─────────────────┘
                   │                 │                  │
                   ▼                 ▼                  ▼
       ┌──────────────────┐  ┌──────────────────┐ ┌──────────────────┐
       │     Keycloak     │  │    PostgreSQL    │ │ Object Storage / │
       │ (OAuth2 / OIDC)  │  │ 15 (FTS + GIN)   │ │ S3 / Apache Tika │
       └──────────────────┘  └──────────────────┘ └──────────────────┘
```
*Figure 3.1: High-Level 3-Tier Enterprise Architecture of INSA-KMS*

### 3.1.2 Architectural Framework and System Topology

To achieve high availability, strict security boundaries, and modular maintainability, INSA-KMS was designed around a resilient 3-tier enterprise architecture. The system decouples presentation, business services, identity federation, and data persistence into cleanly separated layers communicating over secure, standard protocols.

**Table 3.1: Technology Stack Matrix for INSA-KMS**

| Architectural Tier | Technology / Framework | Version | Engineering Justification |
|---|---|---|---|
| **Frontend UI/UX** | Next.js (React, TypeScript) | 14.2+ | Server-Side Rendering (SSR) and Client-Side Hydration via App Router; static route optimization and strict type safety. |
| **Styling & Components** | Tailwind CSS + Radix UI | 3.4+ / 1.x | Headless, accessible primitives with custom enterprise cyber design system tokens; zero runtime CSS overhead. |
| **Backend Framework** | Spring Boot (Java 21 LTS) | 3.3.3 | Enterprise-grade dependency injection, high-throughput virtual threads (Project Loom), and comprehensive security ecosystem. |
| **Security & Identity** | Keycloak (OIDC / OAuth 2.0) | 26.7.2 | Sovereign, open-source identity provider; centralized credential management, SSO, brute-force protection, and RS256 token signing. |
| **Relational Database** | PostgreSQL Server | 15.6 | ACID-compliant relational data modeling; native `tsvector` and `tsquery` full-text search engine with Generalized Inverted Indexes (GIN). |
| **Document Ingestion** | Apache Tika Core & Parsers | 2.9.2 | Asynchronous metadata extraction and full-text content parsing across PDF, DOCX, XLSX, ODT, and plain-text files. |
| **Video Conferencing** | Jitsi Meet & Prosody XMPP | Latest Stable | Containerized sovereign WebRTC conferencing; XMPP BOSH signaling hardened via HMAC-SHA256 JWT admission tokens. |
| **Containerization** | Docker & Docker Compose | 26.x | Deterministic, multi-stage microservices packaging, environment parity, and isolated network bridge boundaries. |

---

### 3.1.3 Subsystem 1: Identity and Access Management (Keycloak OIDC Federation)

In high-security environments, storing user credentials, password hashes, and session state within the application database introduces severe attack surfaces. In accordance with INSA's sovereign security guidelines, all authentication and identity management operations were offloaded to an enterprise **Keycloak 26.7.2** identity broker operating under the **OpenID Connect (OIDC)** and **OAuth 2.0** specifications.

```
Browser (Client)          Keycloak 26.7.2           Next.js Frontend        Spring Boot Backend
       │                         │                         │                         │
       │─── 1. Access Protected ──────────────────────────>│                         │
       │    Route (/library)     │                         │                         │
       │                         │                         │                         │
       │<── 2. Redirect to Keycloak Auth Endpoint ─────────│                         │
       │    (/protocol/openid-connect/auth)                │                         │
       │                         │                         │                         │
       │─── 3. Submit Credentials ──>                      │                         │
       │    (Username/Password)  │                         │                         │
       │                         │                         │                         │
       │<── 4. 302 Redirect with Auth Code ────────────────│                         │
       │    (/auth/callback?code=AUTH_CODE)                │                         │
       │                                                   │                         │
       │─── 5. Forward Auth Code to Callback Route ───────>│                         │
       │                                                   │                         │
       │                         │<── 6. Exchange Code for ├─────────────────────────┤
       │                         │    Token (/token)       │                         │
       │                         │─── 7. Return Access, ──>│                         │
       │                         │    ID, Refresh JWTs     │                         │
       │                                                   │                         │
       │<── 8. Establish Secure Session + Cookie ──────────│                         │
       │                                                   │                         │
       │─── 9. API Request with Bearer Access Token ────────────────────────────────>│
       │       (GET /api/v1/documents)                     │                         │
       │                                                   │                         │
       │                         │<── 10. Fetch / Cache JWKS Public Keys ────────────│
       │                         │    (/protocol/openid-connect/certs)               │
       │                         │─── 11. Return RS256 Public Key (JWKS) ───────────>│
       │                                                   │                         │
       │                                                   │    12. Validate Signature,
       │                                                   │        Audience, Issuer,
       │                                                   │        Expiration, Roles│
       │                                                   │                         │
       │<── 13. Return 200 OK + Filtered JSON Payload ───────────────────────────────│
```
*Figure 3.2: OpenID Connect (OIDC) Authorization Code Flow with Keycloak 26*

#### Technical Implementation Details:
1. **Dedicated Enterprise Realm:** A dedicated realm named `kms-realm` was constructed (exported as `keycloak/kms-realm.json`). Within this realm, an OpenID Connect client named `kms-frontend-client` was provisioned with standard flow enabled and public client credentials, restricted strictly to authorized redirect URIs (`http://localhost:3000/*`, `https://kms.insa.gov.et/*`).
2. **Cryptographic Token Verification:** The Spring Boot backend acts strictly as an **OAuth2 Resource Server** (`spring-boot-starter-oauth2-resource-server`). It never handles raw user passwords. Upon receiving an incoming HTTP request containing an `Authorization: Bearer <JWT>` header, Spring Security's `JwtDecoder` verifies:
   - **Cryptographic Signature:** The token's signature is verified against Keycloak's JSON Web Key Set (JWKS) public certificates endpoint (`/realms/kms-realm/protocol/openid-connect/certs`) utilizing asymmetric RS256 (RSA Signature with SHA-256).
   - **Issuer and Audience Invariants:** The `iss` claim must match `http://localhost:8080/realms/kms-realm`, and the token must not be expired (`exp > now`).
   - **Role Extraction:** A custom `KeycloakJwtGrantedAuthoritiesConverter` was authored in Java to extract roles nested inside the `realm_access.roles` JSON claim and translate them into Spring Security `GrantedAuthority` objects prefixed with `ROLE_`.

---

### 3.1.4 Subsystem 2: Document Repository and Lifecycle Management

The core operational function of INSA-KMS is providing a robust, version-controlled repository for internal digital assets.

#### 1. Entity Modeling and Metadata Taxonomy
Every uploaded document is represented in the database by two primary entities:
- **`Document` Entity:** Represents the logical document entity. It captures immutable business metadata: unique UUID (`id`), title, description, category, folder hierarchy, department ownership, security classification (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`), retention policy, and current active version pointer.
- **`DocumentVersion` Entity:** Represents an immutable physical snapshot of the file. Every time an existing document is updated, a new `DocumentVersion` row is created, capturing: version number (e.g., `v1.0`, `v1.1`), file name, MIME type, byte size, storage URI path, uploader UUID, upload timestamp, change summary, and a SHA-256 cryptographic checksum.

#### 2. Cryptographic Integrity and Anti-Tampering (SHA-256)
To detect unauthorized modification or bit rot at the storage layer, the document ingestion pipeline computes the cryptographic SHA-256 hash of the incoming byte stream immediately upon upload:
$$\text{Checksum} = \text{SHA-256}(\text{InputStream})$$
This hexadecimal digest is permanently recorded in `document_versions.checksum_sha256`. Prior to streaming any file download to an authorized client, the storage service recomputes the checksum of the stored file on disk and verifies it against the recorded database value. If a mismatch occurs, the download is aborted with an alert indicating file tampering.

#### 3. Concurrency Control and Collaborative Check-in / Check-out
To prevent conflicting overwrites when multiple engineers collaborate on the same standard operating procedure or policy document, a pessimistic check-in/check-out lock mechanism was engineered:
- When an authorized Contributor initiates an edit, the document is flagged as `is_locked = true` with `locked_by_user_id = <UUID>` and `locked_at = <Timestamp>`.
- While locked, other users can view and download the latest published version but are prevented from uploading revisions.
- Upon completing edits, the locking user uploads the updated file, releasing the lock and automatically incrementing the version index. Administrators and Content Owners possess administrative override capabilities to break stale locks with mandatory audit logging.

---

### 3.1.5 Subsystem 3: Asynchronous Full-Text Search and Apache Tika Indexing

In an enterprise repository storing thousands of technical documents, hierarchical folder browsing alone is insufficient for rapid information retrieval. INSA-KMS implements an intelligent full-text search (FTS) engine powered by an asynchronous **Apache Tika** text extraction pipeline coupled with **PostgreSQL 15 GIN** indexes.

```
Incoming Upload ──> Save File to Disk/S3 ──> Compute SHA-256 ──> Persist Document & Version (PostgreSQL)
                                                                             │
                                                                             ▼
                                                                Publish Ingestion Event
                                                                             │
                                                                             ▼
                                                             @Async Background Parser Thread
                                                                             │
                                                                             ▼
                                                                  Execute Apache Tika Parser
                                                                (Auto-detect format & extract text)
                                                                             │
                                                                             ▼
                                                                Normalize & Sanitize Content
                                                                             │
                                                                             ▼
                                                               Execute SQL tsvector Update:
                                                         to_tsvector('english', coalesce(title,'') ||
                                                         ' ' || coalesce(extracted_text,''))
                                                                             │
                                                                             ▼
                                                              Update PostgreSQL GIN Index
```
*Figure 3.3: Asynchronous Document Ingestion, SHA-256 Hashing, and Tika FTS Pipeline*

#### Engineering Pipeline:
1. **Asynchronous Decoupling:** Parsing large multi-megabyte technical manuals or PDF specifications during an HTTP POST upload request causes unacceptable request timeouts and degrades server throughput. The extraction was decoupled using Spring's `@Async` thread pool (`ThreadPoolTaskExecutor`).
2. **Multi-Format Extraction:** The background worker invokes **Apache Tika Core** (`AutoDetectParser`), which inspects MIME magic bytes and extracts raw text from PDF, DOCX, XLSX, PPTX, ODT, HTML, and TXT files.
3. **PostgreSQL Lexical Analysis and GIN Indexing:**  
   The extracted text is persisted into a dedicated `search_vector` column typed as `tsvector`. PostgreSQL's native lexical analyzer parses the text into normalized tokens (lexemes), strips stop-words, and applies linguistic stemming (e.g., transforming "vulnerabilities", "vulnerable", and "vulnerability" to the common root `vulner`).
   A Generalized Inverted Index (GIN) was created across the table:
   ```sql
   CREATE INDEX idx_document_search_vector ON documents USING GIN(search_vector);
   ```
4. **Search Execution and Relevancy Ranking:**  
   When a user inputs a query (e.g., `"cryptographic key exchange vulnerability"`), the API transforms the string into a formatted `tsquery` executing the query:
   ```sql
   SELECT id, title, category, classification,
          ts_rank_cd(search_vector, query) AS rank,
          ts_headline('english', extracted_text, query, 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') AS snippet
   FROM documents, to_tsquery('english', 'cryptographic & key & exchange & vulnerability') query
   WHERE search_vector @@ query
     AND classification IN (:allowedClassifications)
   ORDER BY rank DESC;
   ```
   This architecture delivers sub-second search responses across the entire repository while highlighting matching keywords directly in search result snippets.

---

### 3.1.6 Subsystem 4: Role-Based and Attribute-Based Access Control (RBAC & ABAC)

Given the national security context of INSA, data confidentiality is governed through a dual-layered security model combining **Role-Based Access Control (RBAC)** for operational privileges with **Attribute-Based Access Control (ABAC)** for data classification clearance.

#### 1. Role-Based Access Control (RBAC) Matrix
Seven distinct enterprise roles are configured within the Keycloak realm and mapped to Spring Security authority tokens:

**Table 3.2: Keycloak Enterprise Realm Roles and Authorization Permissions**

| Realm Role | Scope and Responsibilities | Specific System Permissions |
|---|---|---|
| `ROLE_SUPER_ADMIN` | Global System Administration | Manage system configuration, database backups, realm settings, and full system override. |
| `ROLE_ADMIN` | Operational Administration | User lifecycle management, department provisioning, storage quota allocation, and system telemetry. |
| `ROLE_CONTENT_OWNER` | Departmental Knowledge Lead | Create folder hierarchies, assign departmental permissions, approve document publication, and archive content. |
| `ROLE_CONTRIBUTOR` | Technical Staff / Engineer | Upload new documents, author new versions, check-out files for editing, participate in discussions. |
| `ROLE_VIEWER` | Read-Only Consumer | Search, view, and download documents within authorized classification tiers; no modification rights. |
| `ROLE_COMPLIANCE_OFFICER` | Governance & Legal Auditor | Define retention schedules, inspect legal holds, review access logs, and generate regulatory compliance reports. |
| `ROLE_IT_SECURITY` | Cybersecurity Monitoring | Real-time inspection of forensic audit logs, monitoring authentication anomalies, and investigating security alerts. |

#### 2. Attribute-Based Access Control (ABAC) Classification Clearance
In addition to their role, every user possesses a security clearance attribute (`clearance_level`). Documents are assigned one of four classification levels:

**Table 3.3: Document Security Classification Matrix (ABAC Clearance)**

| Classification Level | Definition and Sensitivity | Access Clearance Required | Handling Controls |
|---|---|---|---|
| `PUBLIC` | Information approved for public dissemination. | Any authenticated user. | Standard storage; watermarking disabled. |
| `INTERNAL` | Routine internal operational memos and technical guides. | `ROLE_VIEWER` or higher with `INTERNAL` clearance. | Restricted to INSA internal network IP ranges. |
| `CONFIDENTIAL` | Proprietary research, network topologies, vulnerability reports. | `ROLE_CONTRIBUTOR` or higher with `CONFIDENTIAL` clearance. | Strict audit logging on every read; download watermarked with user ID. |
| `RESTRICTED` | High-level cryptographic keys, active cyber-incident investigations. | Explicit per-user ACL or `SUPER_ADMIN` with `RESTRICTED` clearance. | Two-factor re-authentication required prior to access; downloads blocked. |

Every database search and document fetch query enforces these bounds at the repository layer using Spring Data JPA specifications:
$$\text{Access Granted} \iff (\text{User Role} \ge \text{Required Action Privilege}) \land (\text{User Clearance} \ge \text{Document Classification})$$

---

### 3.1.7 Subsystem 5: Secure Virtual Video Discussion and Jitsi Meet Integration

To facilitate secure real-time collaboration among engineers analyzing sensitive cyber incidents, a dedicated **Virtual Video Discussion Subsystem** was architected, replacing third-party commercial meeting software with an on-premise, self-hosted **Jitsi Meet / Prosody XMPP** cluster.

```
Host (admin_ops)         Spring Boot KMS Backend         Keycloak 26.7          Prosody XMPP (Jitsi)
       │                            │                           │                        │
       │── 1. POST /video-sessions ─>│                           │                        │
       │   (title, participantUUIDs)│                           │                        │
       │                            │── 2. Verify Host UUID ───>│                        │
       │                            │<─ Active & Authorized ────│                        │
       │                            │                                                    │
       │                            │── 3. Validate Participant UUIDs in DB              │
       │                            │── 4. Exclude Host from Normal Participants         │
       │                            │── 5. Calculate Scheduled End Time                  │
       │                            │── 6. Persist Session & Participants (PostgreSQL)   │
       │                            │── 7. Dispatch In-App Notifications                 │
       │                            │── 8. Record Audit Log Entry                        │
       │                            │                                                    │
       │<─ 201 Created (Session ID)─│                                                    │
       │                            │                                                    │
       │── 9. POST /join ──────────>│                                                    │
       │                            │── 10. Check Room Access Authorization (Fail-Closed)│
       │                            │── 11. Generate RFC 7519 HMAC-SHA256 Token:         │
       │                            │       room: 'kms-room-<uuid>'                      │
       │                            │       iss: 'kms-backend', aud: 'jitsi'             │
       │                            │       affiliation: 'owner' (host) or 'member'      │
       │                            │       ttl: 300 seconds                             │
       │                            │                                                    │
       │<─ 200 OK (Clean URL + JWT)─│                                                    │
       │                            │                                                    │
       │── 12. Connect via XMPP BOSH Handshake with JWT ────────────────────────────────>│
       │       (https://localhost:8443/http-bind)                                        │
       │                                                                                 │
       │                                Prosody Lua mod_auth_token Validates Signature:   │
       │                                - Verify HMAC-SHA256 signature against secret    │
       │                                - Verify 'iss' == 'kms-backend', 'aud' == 'jitsi'│
       │                                - Verify 'room' == requested room                │
       │                                - Verify token not expired                       │
       │                                                                                 │
       │<─ 13. SASL <success/> Handshake Established ────────────────────────────────────│
```
*Figure 3.4: Secure Jitsi Meet Video Session Lifecycle and HMAC-SHA256 Token Flow*

#### Key Engineering Invariants Enforced:
1. **Interactive Debounced Participant Selector:**  
   The frontend modal (`CreateVideoSessionModal.tsx`) replaces static text inputs with an interactive user selector. When opened, it automatically loads active KMS colleagues, transitioning dynamically to debounced search queries across full name, username, and email. Removable chips, keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), and host self-selection disabling (`"You are the host"`) ensure a seamless user experience.
2. **Fail-Closed Room Isolation:**  
   Uninvited users attempting to access a video session receive a `403 Forbidden` error and are never issued a room token.
3. **Cryptographic Token Binding (RFC 7519):**  
   Tokens are signed using HMAC-SHA256 with a 300-second time-to-live (TTL). The token payload explicitly binds the user to a single room name:
   $$\text{Payload} = \{\text{iss}: \text{"kms-backend"}, \text{aud}: \text{"jitsi"}, \text{room}: \text{"kms-room-"}+\text{sessionUUID}, \text{context}: \{\text{user}: \{\dots\}\}\}$$
4. **Zero URL Parameter Leakage:**  
   Meeting links are returned as clean URLs (`/meeting/<uuid>`), passing the admission token securely through authenticated session payloads to prevent tokens from leaking into browser history, proxies, or server access logs.

---

### 3.1.8 Subsystem 6: Automated Tamper-Evident Audit Logging

In compliance with national cybersecurity standards (ISO/IEC 27001 and NIST SP 800-53 controls), INSA-KMS implements an automated, aspect-oriented audit logging subsystem utilizing **Spring AOP**.

```
Client API Request ──> Spring Security Filter ──> Controller Method Execution
                                                         │
                                                         ▼
                                               @AuditLog Annotation
                                                         │
                                                         ▼
                                            Spring AOP Around Advice
                                             (AuditLoggingAspect)
                                                         │
                                ┌────────────────────────┴────────────────────────┐
                                ▼                                                 ▼
                       Capture Request Context:                         Proceed with Business
                       - Actor UUID & Username                           Service Execution
                       - HTTP Method & Endpoint URI                               │
                       - Client IP Address                                        ▼
                       - User-Agent Header                              Capture Outcome:
                       - Target Resource & ID                           - SUCCESS / FAILURE
                                │                                       - Error Message (if any)
                                │                                       - Execution Duration (ms)
                                └────────────────────────┬────────────────────────┘
                                                         │
                                                         ▼
                                            Construct AuditLog Entity
                                                         │
                                                         ▼
                                           Persist to PostgreSQL Audit Table
                                            (Requires Separate Transaction)
```
*Figure 3.5: Spring AOP Tamper-Evident Audit Logging Interceptor Architecture*

#### Implementation Structure:
1. **Custom Annotation (`@AuditLog`):**  
   A Java annotation `@AuditLog(action = ..., resourceType = ...)` was declared and placed on all state-altering controller and service methods (e.g., document uploads, version deletions, permission changes, video room joins).
2. **AOP Aspect Interceptor (`AuditLoggingAspect`):**  
   Using `@Around` advice, the aspect intercepts method execution. It extracts the authenticated user's details from the `SecurityContextHolder`, captures the remote IP address from the `HttpServletRequest`, records execution duration, and writes an immutable record to the `audit_logs` database table.
3. **Forensic Immutability:**  
   The `audit_logs` database entity is marked with `@Immutable`. Database-level table grants prevent `UPDATE` or `DELETE` operations on the `audit_logs` table for all standard application roles, guaranteeing that even compromised administrator accounts cannot rewrite historical access records.

---

### 3.1.9 Testing, Quality Assurance, and Runtime Verification

To ensure software reliability, performance, and security compliance, comprehensive automated and live verification suites were executed.

#### 1. Automated Unit and Integration Testing (Maven Surefire)
Automated testing was implemented using **JUnit 5**, **Mockito**, and Spring Boot's testing framework. A total of 20 automated tests were executed covering all core functionalities:

**Table 3.4: Summary of 20 Automated Unit and Integration Tests**

| Test Identifier | Test Method Name | Component Tested | Result |
|---|---|---|:---:|
| `TEST-01` | `testCreateVideoSession` | Session creation, host assignment, notifications | **PASS** |
| `TEST-02` | `testJoinVideoSession` | Authorized user receives valid Jitsi JWT | **PASS** |
| `TEST-03` | `testUnauthorizedUserCannotJoinSession` | Non-invited user rejected with 403 Forbidden | **PASS** |
| `TEST-04` | `testCannotJoinEndedSession` | Rejects join request for terminated meeting with 400 | **PASS** |
| `TEST-05` | `testHostEndSessionLifecycle` | Host ends session; non-host receives 403 | **PASS** |
| `TEST-06` | `testModeratorAffiliationClaims` | Host receives `affiliation=owner`; participant `member` | **PASS** |
| `TEST-07` | `testTamperedJwtSignatureRejection` | Altered JWT signature rejected by decoder | **PASS** |
| `TEST-08` | `testRoomScopingMismatchRejection` | Token bound to Room A cannot access Room B | **PASS** |
| `TEST-09` | `testExpiredJwtRejection` | Token with expired timestamp rejected | **PASS** |
| `TEST-10` | `testWrongIssuerAudienceRejection` | Incorrect `iss` or `aud` claims rejected | **PASS** |
| `TEST-11` | `testCreateVideoSession_WithParticipantUserIds` | Participant resolution by stable User UUID | **PASS** |
| `TEST-12` | `testCreateVideoSession_MixedUuidAndUsernames` | Deduplication of mixed UUID/username requests | **PASS** |
| `TEST-13` | `testCreateVideoSession_HostExclusion` | Host excluded from standard participant records | **PASS** |
| `TEST-14` | `testCreateVideoSession_InactiveUserRejection` | Inactive user IDs rejected with 400 Bad Request | **PASS** |
| `TEST-15` | `testCreateVideoSession_InvalidUserRejection` | Non-existent UUIDs rejected with 400 Bad Request | **PASS** |
| `TEST-16` | `testCreateVideoSession_DurationCalculation` | `durationMinutes` calculates `scheduledEnd` | **PASS** |
| `TEST-17` | `testCreateVideoSession_ExplicitScheduledEndPreserved` | Explicit client end timestamp preserved | **PASS** |
| `TEST-18` | `testCreateVideoSession_ZeroParticipants` | Valid creation with host as sole participant | **PASS** |
| `TEST-19` | `testAvailableUsersSearchByNameAndEmail` | Search across username, display name, and email | **PASS** |
| `TEST-20` | `testDirectProsodyProtocol` | Token exchange protocol compliance validation | **PASS** |

*Maven Surefire Result: Tests run: 20, Failures: 0, Errors: 0, Skipped: 0. Time elapsed: 26.75 seconds. BUILD SUCCESS.*

#### 2. Live Runtime End-to-End Integration Verification
To validate the system under real operational conditions, an automated PowerShell verification script (`verify_participant_selection_runtime.ps1`) was executed against the running containerized environment: Keycloak (`:8080`), Spring Boot (`:8081`), and PostgreSQL (`:5432`).

**Table 3.5: End-to-End Live Runtime Integration Test Results (10 Scenarios)**

| Scenario Check | Test Scenario Description | Expected Invariant | Actual System Behavior | Verdict |
|---|---|---|---|:---:|
| `[1/10]` | Keycloak Authentication | Obtain OIDC JWTs for `admin_ops`, `contributor`, `viewer` | Valid RS256 JWTs generated | **PASS** |
| `[2/10]` | User Search API | Search by display name, username, and email | Returns safe metadata; zero password/hash leakage | **PASS** |
| `[3/10]` | Backend Input Validation | Non-existent UUID, bad username, negative duration | Rejected with 400 Bad Request | **PASS** |
| `[4/10]` | Optional Selection | Create video session with 0 invited participants | Success; host is sole participant | **PASS** |
| `[5/10]` | Participant UUID Addition | Create session with `contributor.id` | Host is `HOST`, contributor is `PARTICIPANT` | **PASS** |
| `[6/10]` | Deduplication & Host Exclusion | Pass duplicate UUIDs and Host's own UUID | Host remains sole host; contributor deduplicated | **PASS** |
| `[7/10]` | In-App Notification | Verify notification delivery for invited colleague | `VIDEO_SESSION_INVITED` event delivered | **PASS** |
| `[8/10]` | Authorization Enforcements | Unauthenticated (401) and uninvited join (403) | 401 Unauthorized and 403 Forbidden enforced | **PASS** |
| `[9/10]` | Session Lifecycle & Jitsi JWT | Host start, participant join, clean URL, host end | Proper lifecycle transitions; valid JWT issued | **PASS** |
| `[10/10]` | Discussion Non-Regression | Post text replies and topic interactions | Discussion threads fully operational | **PASS** |

#### 3. Direct Prosody XMPP BOSH Protocol Verification
To verify that the Jitsi Prosody signaling server strictly enforces room admission, a specialized test script (`verify_direct_prosody_jwt.ps1`) executed direct XMPP BOSH handshakes against `https://localhost:8443/http-bind`:
- **Test A (No JWT):** Prosody returned `<failure xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><not-allowed/><text>token required</text></failure>` (**PASS**).
- **Test B (Expired JWT):** Prosody rejected with `<text>Not acceptable by exp</text>` (**PASS**).
- **Test C (Tampered Signature):** Prosody rejected with `<text>Invalid signature</text>` (**PASS**).
- **Test D (Room Mismatch):** Token bound to `room-A` used on `room-B` was rejected with `<error type='cancel'><not-allowed/><text>Room and token mismatched</text></error>` (**PASS**).
- **Test E (Valid INSA-KMS JWT):** Prosody accepted with `<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>` (**PASS**).

---

## 3.2 Other Responsibilities During the Internship

Beyond core full-stack programming, my internship encompassed a wide range of professional engineering responsibilities:

### 1. Agile Scrum Ceremonies and Sprint Planning
I actively participated in all team agile ceremonies:
- **Daily Standups:** Delivered concise daily progress reports, articulated technical blockers, and coordinated dependencies with backend and frontend teammates.
- **Sprint Planning Sessions:** Contributed to breaking down high-level requirements from the *KMS Requirements Specification* into actionable user stories, estimating story points, and defining acceptance criteria.
- **Sprint Retrospectives:** Shared observations regarding local development environment bottlenecks and collaborated on continuous improvement of our testing workflows.

### 2. Peer Code Reviews and Collaborative Pair Programming
In accordance with INSA's development standards, no code was merged into the main branch without peer review:
- I reviewed pull requests authored by colleagues, verifying adherence to TypeScript typing standards, clean architectural separation in Spring Boot, and proper exception handling.
- Engaged in collaborative pair programming sessions with fellow developers, particularly when untangling subtle React state re-rendering issues in the Next.js document library and configuring Spring Security filter chains.

### 3. Technical Documentation and System Specification
I authored and maintained comprehensive technical documentation throughout the project:
- Documented all RESTful endpoints using OpenAPI 3.0 / Swagger UI annotations (`@Operation`, `@ApiResponse`), providing live API documentation at `http://localhost:8081/swagger-ui.html`.
- Drafted the *Deployment and Operations Guide*, detailing container orchestration steps, Keycloak realm import commands, and database migration procedures using Flyway.

### 4. Security Vulnerability Assessments and Code Audits
Working within a cybersecurity agency provided the opportunity to participate in security auditing activities:
- Utilized static application security testing (SAST) tools (SonarQube) to scan backend Java and frontend TypeScript codebases for common vulnerabilities, including OWASP Top 10 risks (SQL injection, XSS, insecure deserialization).
- Verified dependency trees using `mvn dependency:check` and `npm audit` to detect and remediate known Common Vulnerabilities and Exposures (CVEs) in third-party libraries.

---

## 3.3 Technical Knowledge and Skills from Coursework Beneficial for Assignment

The rigorous academic curriculum provided by the **Department of Computer Science and Engineering** at **Adama Science and Technology University (ASTU)** was foundational to my performance during this internship. Theoretical principles learned in lecture halls directly informed practical engineering decisions:

**Table 3.6: Mapping of ASTU Academic Courses to Industrial Project Tasks**

| ASTU Academic Course | Core Theoretical Concepts Learned | Direct Industrial Application in INSA-KMS |
|---|---|---|
| **Data Structures and Algorithms (CSE 2101 / ECE 2102)** | Inverted indexing, hash functions, tree traversals, computational complexity ($O(1)$, $O(\log n)$). | Designed PostgreSQL GIN full-text index structures; evaluated SHA-256 hash collision resistance; optimized multi-level document folder traversal algorithms. |
| **Database Systems (CSE 3201)** | Relational algebra, 3NF normalization, ACID transaction properties, foreign keys, B-trees. | Designed the 18-table normalized PostgreSQL database schema; managed referential integrity cascades; configured transactional isolation levels (`@Transactional(readOnly = true)`). |
| **Object-Oriented Programming & Design Patterns (CSE 2102)** | Encapsulation, Polymorphism, Inversion of Control (IoC), Dependency Injection, Singleton, Factory, Repository, and DTO patterns. | Developed modular Spring Boot microservices; implemented repository and service abstractions; decoupled API payloads from entities using Data Transfer Objects (DTOs); utilized Spring AOP. |
| **Computer Networks and Data Communication (CSE 3301)** | TCP/IP protocol stack, HTTP/HTTPS methods, TLS handshakes, WebSocket, XMPP, network sockets. | Configured secure CORS/CSRF headers; engineered RESTful HTTP endpoints; analyzed XMPP BOSH signaling packets and WebRTC media streams for Jitsi Meet conferencing. |
| **Software Engineering & System Analysis (CSE 3101)** | SDLC models (Agile/Scrum), UML modeling (Use Case, Sequence, Class diagrams), requirements elicitation, verification testing. | Analyzed the *KMS Requirements Specification*; modeled system sequence diagrams for OIDC token exchanges; authored automated unit and integration tests using JUnit 5. |
| **Information Assurance and Cybersecurity (CSE 4401)** | Symmetric vs. Asymmetric cryptography (RSA vs. HMAC), digital signatures, Public Key Infrastructure (PKI), OAuth 2.0, JWT. | Integrated Keycloak RS256 public-key verification; implemented HMAC-SHA256 Jitsi token generation; configured fine-grained RBAC/ABAC clearance models; prevented OWASP Top 10 risks. |
| **Web Technologies and Internet Computing (CSE 3202)** | Client-server architecture, DOM manipulation, asynchronous JavaScript (Promises, `async/await`), CSS box model. | Developed the responsive frontend using Next.js 14, React hooks (`useState`, `useEffect`, `useCallback`), TypeScript interfaces, and Tailwind CSS responsive grid layouts. |

---

## 3.4 Relevant Research Projects Identified in Activities in the Organization

During my immersion in INSA's technical ecosystem, I identified three advanced research areas where academic computer science principles could address critical challenges facing national security institutions:

### Research Project 1: Enterprise Semantic Search and Multilingual Retrieval-Augmented Generation (RAG) for Classified National Archives

#### 1. Context and Problem Statement
While the full-text search engine implemented in INSA-KMS utilizing Apache Tika and PostgreSQL FTS delivers sub-second keyword matching, it relies fundamentally on lexical tokenization and syntactic stemming. It cannot comprehend semantic nuance, synonyms, or conceptual context. For example, a query for *"unauthorized network intrusion"* will not match a document discussing *"malicious lateral movement via stolen credentials"* unless those exact words appear. 
Furthermore, within Ethiopian national institutions, a significant volume of intelligence and administrative documentation is authored in **Amharic** (using the Ge'ez script). Existing open-source stemming algorithms and embedding models exhibit poor performance on Ethiopic morphology, complex inflectional variations, and low-resource semantic representations.

#### 2. Proposed Research Architecture
This research project proposes designing a sovereign, localized **Retrieval-Augmented Generation (RAG)** architecture for enterprise knowledge systems:
- **Bilingual Amharic-English Dense Vector Embeddings:** Train a specialized domain-specific transformer embedding model (fine-tuned on bilingual Ethiopian cybersecurity and legal corpuses) that maps both English and Amharic technical documents into a shared continuous semantic vector space ($\mathbb{R}^{768}$).
- **Vector Indexing and Approximate Nearest Neighbor (ANN) Search:** Integrate the `pgvector` extension into PostgreSQL, utilizing Hierarchical Navigable Small World (HNSW) graphs to achieve sub-50ms cosine similarity searches across millions of document embeddings.
- **Air-Gapped Sovereign Large Language Model (LLM) Integration:** Deploy an on-premise, quantized open-weights LLM (such as Llama-3-8B or Mistral-7B) running completely air-gapped on local GPU servers. When an authorized officer queries the system, the top-$k$ semantically relevant document chunks are retrieved, filtered through the user's ABAC clearance level, and synthesized into an accurate, cited intelligence briefing without data leaving INSA's physical perimeter.

```
User Query (English / Amharic)
       │
       ▼
Domain-Specific Bilingual Embedding Model (Dense Vector $\mathbb{R}^{768}$)
       │
       ▼
Vector Database (PostgreSQL + pgvector HNSW Index)
       │
       ▼ (Retrieve Top-k Chunks filtered by ABAC Clearance Level)
Air-Gapped Sovereign LLM (Local GPU Server)
       │
       ▼
Synthesized Contextual Intelligence Briefing with Direct Document Citations
```

---

### Research Project 2: Zero-Trust Dynamic Attribute-Based Access Control (ABAC) with Real-Time Risk Engine

#### 1. Context and Problem Statement
The current access control architecture of INSA-KMS enforces static Role-Based Access Control (RBAC) combined with static document classification levels. While robust, modern cybersecurity threats—such as compromised insider credentials or session hijacking—demand a **Zero-Trust Architecture (ZTA)** as outlined in NIST SP 800-207. In high-threat environments, access decisions must not rely solely on static credentials; they must continuously evaluate dynamic contextual attributes, including client device security posture, anomalous geographic access patterns, time-of-day anomalies, and behavioral risk scores.

#### 2. Proposed Research Architecture
This research proposes the design of an intelligent, dynamic Policy Decision Point (PDP) and real-time risk engine:
- **Dynamic Attribute Engine:** Extends the authorization model to evaluate environmental attributes: device compliance status (presence of endpoint detection and response software), network origin (internal secure VLAN vs. encrypted VPN), and rate of document downloads.
- **Machine Learning Behavioral Anomaly Detection:** Implement an unsupervised isolation forest or autoencoder neural network that models baseline access patterns for every user. If a contributor who typically accesses 5 internal documents a week suddenly attempts to download 200 `CONFIDENTIAL` cryptographic specifications at 02:00 AM on a Sunday, the anomaly score spikes.
- **Adaptive Step-Up Authentication:** The PDP automatically triggers step-up verification (demanding a hardware FIDO2 security key or biometric confirmation) or temporarily restricts document visibility while notifying the IT Security Directorate in real time.

---

### Research Project 3: Cryptographically Verifiable Immutable Audit Trails Using Merkle Trees and Distributed Ledgers

#### 1. Context and Problem Statement
Although INSA-KMS implements an automated audit logging subsystem via Spring AOP, the resulting audit records are stored within relational database tables. Even with strict database permission controls, a sophisticated adversary or rogue database administrator possessing superuser (`postgres`) privileges could theoretically tamper with or delete audit records to conceal illicit activity. In high-profile national security investigations, audit logs must provide mathematical non-repudiation and court-admissible proof of integrity.

#### 2. Proposed Research Architecture
This research investigates the integration of cryptographic **Merkle Trees** and private permissioned distributed ledgers into enterprise audit frameworks:
- **Sequential Merkle Hashing:** Each audit log entry is cryptographically hashed:
  $$H_i = \text{SHA-256}(\text{Record}_i \parallel H_{i-1})$$
  creating an immutable cryptographic hash chain similar to a blockchain.
- **Periodic Merkle Root Anchoring:** At fixed intervals (e.g., every 10 minutes), the cumulative Merkle root representing all audit events is signed using INSA's national Public Key Infrastructure (PKI) sovereign private key and anchored into a write-once, tamper-evident private ledger.
- **Mathematical Integrity Proofs:** If any historical log entry is modified, deleted, or inserted retroactively, the computed Merkle root diverges mathematically from the signed anchor, immediately exposing the tampering and identifying the exact timestamp of data corruption during forensic investigations.
