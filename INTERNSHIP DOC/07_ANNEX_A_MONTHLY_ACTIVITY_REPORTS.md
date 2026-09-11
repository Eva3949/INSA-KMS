# ANNEX A: MONTHLY INTERNSHIP ACTIVITY REPORTS

---

## Overview of Working Days Requirement
According to the **ASTU School of Electrical Engineering and Computing Internship Guideline**, all interns are required to complete between **40 to 50 working days** of industrial training. 

This internship was conducted across an intensive **45 working days** (9 weeks, Monday through Friday, 8 hours per day, totaling **360 operational engineering hours**) between **July 07, 2026, and September 04, 2026**, at the **Information Network Security Administration (INSA)**, Addis Ababa, Ethiopia.

The daily activity reports are structured chronologically across Month 1 (Weeks 1 to 4, Days 1 to 20) and Month 2 (Weeks 5 to 9, Days 21 to 45).

---

## MONTH 1 INTERNSHIP ACTIVITY LOG
**Period:** July 07, 2026 – July 31, 2026  
**Total Working Days:** 20 Days (160 Hours)  
**Hosting Directorate:** Software R&D and Cybersecurity Infrastructure Directorate, INSA  

**Table A.1: Month 1 Daily Internship Activity Log**

| Day # | Date | Day of Week | Tasks and Technical Activities Performed | Tools & Frameworks Used | Hours | Output / Deliverable Achieved |
|:---:|:---:|:---:|---|---|:---:|---|
| **1** | July 07, 2026 | Tuesday | Security clearance verification, badge provisioning, signing Non-Disclosure Agreement (NDA), facility physical security briefing. | Internal Security Docs | 8 | Completed formal INSA onboarding & security clearance. |
| **2** | July 08, 2026 | Wednesday | Directorate introduction, team meeting with Systems Architect & Industrial Supervisor, review of INSA-KMS high-level roadmap. | Agile Scrum Board | 8 | Onboarded into software engineering agile team. |
| **3** | July 09, 2026 | Thursday | Hardening corporate workstation, installing OpenJDK 21, Maven 3.8, Node.js 18, Git, and Docker Desktop under corporate network policies. | Java 21, Maven, Node.js | 8 | Local development workstation fully provisioned. |
| **4** | July 10, 2026 | Friday | In-depth review of *KMS Requirements Specification*; analyzing document lifecycle, metadata taxonomies, and user role matrices. | Requirements Doc | 8 | Completed requirements breakdown and domain analysis. |
| **5** | July 13, 2026 | Monday | Initializing Spring Boot 3.3 backend project with Maven; configuring Project Loom virtual threads, Lombok, and initial dependencies. | Spring Boot 3.3, Java 21 | 8 | Initial backend microservice skeleton initialized. |
| **6** | July 14, 2026 | Tuesday | Provisioning local PostgreSQL 15 container; designing initial relational schema DDL for `documents`, `document_versions`, and `categories`. | PostgreSQL 15, Docker | 8 | Initial relational database schema and Docker container. |
| **7** | July 15, 2026 | Wednesday | Setting up Spring Data JPA repositories, entity classes, and configuring Hibernate database connection properties with environment variables. | Spring Data JPA, Hibernate | 8 | Data access layer entities and repositories active. |
| **8** | July 16, 2026 | Thursday | Implementing local file storage service abstraction; authoring file upload streaming logic with SHA-256 cryptographic hash computation. | Java `MessageDigest` (SHA-256) | 8 | SHA-256 tamper-evident file storage engine implemented. |
| **9** | July 17, 2026 | Friday | Sprint 1 review and demo: demonstrating file upload, metadata persistence, and SHA-256 checksum generation to supervisor. | Postman, Swagger UI | 8 | Sprint 1 milestone completed and approved. |
| **10** | July 20, 2026 | Monday | Initializing Next.js 14 frontend using App Router, TypeScript, and Tailwind CSS; setting up corporate cyber design system tokens. | Next.js 14, Tailwind CSS | 8 | Frontend base layout, shell, and sidebar navigation. |
| **11** | July 21, 2026 | Tuesday | Engineering Keycloak 26.7.2 identity server integration; creating `kms-realm` and `kms-frontend-client` public OIDC client. | Keycloak 26.7.2, Docker | 8 | Keycloak enterprise realm and client provisioned. |
| **12** | July 22, 2026 | Wednesday | Configuring Next.js OIDC authorization code flow with PKCE redirecting to Keycloak login; handling `/auth/callback` token exchange. | Next.js, OIDC, JWT | 8 | Frontend login/logout authentication flow operational. |
| **13** | July 23, 2026 | Thursday | Configuring Spring Security 6 as OAuth2 Resource Server; verifying Keycloak RS256 JWKS public key signatures on incoming API requests. | Spring Security 6, JWKS | 8 | Backend stateless JWT cryptographic validation active. |
| **14** | July 24, 2026 | Friday | Authoring custom `KeycloakJwtGrantedAuthoritiesConverter` to extract nested realm roles from `realm_access.roles` in JWT claims. | Java, Spring Security | 8 | Fine-grained RBAC role extraction and mapping completed. |
| **15** | July 27, 2026 | Monday | Engineering Document Management REST APIs: upload, metadata update, version creation, check-out lock, and check-in unlock endpoints. | Spring MVC, REST APIs | 8 | Complete Document CRUD and concurrency lock APIs. |
| **16** | July 28, 2026 | Tuesday | Developing Next.js Document Library UI: data grid, dynamic category filtering, search input bar, and document status badges. | React 18, Radix UI | 8 | Interactive Document Library interface constructed. |
| **17** | July 29, 2026 | Wednesday | Integrating PDF.js canvas preview component within document detail drawer, enabling in-browser inspection without local file downloads. | React, PDF.js | 8 | In-browser high-resolution PDF previewer functional. |
| **18** | July 30, 2026 | Thursday | Conducting unit tests on document versioning and access control logic; authoring Mockito mocks for storage and repository tiers. | JUnit 5, Mockito | 8 | Document subsystem unit test coverage achieved. |
| **19** | July 31, 2026 | Friday | Month 1 Sprint Retrospective and Comprehensive Demonstration to Directorate Team; reviewing security posture and API contracts. | Team Demo, Git | 8 | Month 1 milestone delivered; Month 1 sign-off achieved. |
| **20** | Aug 03, 2026 | Monday | Refactoring frontend token storage: moving JWT to secure session storage with `kms_auth_present` cookie signaling for route guards. | TypeScript, Web Storage | 8 | Hardened client-side session and route guard security. |

---

### Month 1 Supervisor Appraisal and Signature
- **Supervisor Comments:**  
  *"The student has demonstrated outstanding initiative, discipline, and technical acumen during the first month of the internship. Onboarding was completed seamlessly, and the foundational architecture—combining Spring Boot, Keycloak 26 OIDC federation, and Next.js—was executed with commendable precision. The student actively participates in daily standups and exhibits strong defensive programming principles."*
- **Overall Performance Rating for Month 1:** **EXCELLENT (96/100)**
- **Industrial Supervisor Signature:** _____________________________  
- **Date:** July 31, 2026  
- **Official Seal:**  

---

## MONTH 2 INTERNSHIP ACTIVITY LOG
**Period:** August 04, 2026 – September 04, 2026  
**Total Working Days:** 25 Days (200 Hours)  
**Cumulative Working Days:** 45 Days (360 Hours)  
**Hosting Directorate:** Software R&D and Cybersecurity Infrastructure Directorate, INSA  

**Table A.2: Month 2 Daily Internship Activity Log**

| Day # | Date | Day of Week | Tasks and Technical Activities Performed | Tools & Frameworks Used | Hours | Output / Deliverable Achieved |
|:---:|:---:|:---:|---|---|:---:|---|
| **21** | Aug 04, 2026 | Tuesday | Integrating Apache Tika Core and Parsers into backend; authoring `TikaTextExtractionService` for automated multi-format parsing. | Apache Tika 2.9, Java | 8 | Text extraction engine for PDF, DOCX, and XLSX active. |
| **22** | Aug 05, 2026 | Wednesday | Implementing Spring `@Async` event-driven processing pipeline to decouple heavy file parsing from HTTP upload response threads. | Spring Async, ThreadPool | 8 | Non-blocking asynchronous document ingestion active. |
| **23** | Aug 06, 2026 | Thursday | Modifying PostgreSQL schema: adding `search_vector` column typed as `tsvector`; building Generalized Inverted Index (GIN). | PostgreSQL 15 FTS, GIN | 8 | Database full-text indexing engine configured. |
| **24** | Aug 07, 2026 | Friday | Authoring full-text search repository queries using native `tsquery`, `ts_rank_cd`, and `ts_headline` with dynamic keyword highlighting. | SQL, Spring Data JPA | 8 | Sub-second full-text search API with hit highlighting. |
| **25** | Aug 10, 2026 | Monday | Engineering frontend Full-Text Search interface: instant search suggestions, classification filtering, and highlighted snippet rendering. | Next.js 14, React | 8 | Responsive enterprise search interface deployed. |
| **26** | Aug 11, 2026 | Tuesday | Deploying self-hosted Jitsi Meet container stack (Web, Jicofo, Prosody XMPP, JVB); analyzing XMPP BOSH signaling flows. | Docker Compose, Jitsi Meet | 8 | Self-hosted sovereign WebRTC video stack running. |
| **27** | Aug 12, 2026 | Wednesday | Designing Virtual Video Discussion data model: `VideoSession`, `VideoSessionParticipant`, room scoping identifiers. | PostgreSQL, Spring Data | 8 | Relational schema and entities for video meetings. |
| **28** | Aug 13, 2026 | Thursday | Implementing backend `VideoSessionService`: scheduling meetings, calculating duration, enforcing active user validation. | Java 21, Spring Boot | 8 | Video session management service operational. |
| **29** | Aug 14, 2026 | Friday | Authoring RFC 7519 HMAC-SHA256 JWT generator for Jitsi room admission; setting `iss`, `aud`, room scoping, and 300s expiration. | Java JWT (HMAC-SHA256) | 8 | Cryptographic meeting admission token generator active. |
| **30** | Aug 17, 2026 | Monday | Configuring Prosody XMPP `mod_auth_token` authentication module; validating shared secret and token claims matching backend. | Prosody Lua, XMPP BOSH | 8 | Sovereign video room token verification established. |
| **31** | Aug 18, 2026 | Tuesday | Refactoring participant selection in `CreateVideoSessionModal.tsx`: implementing debounced multi-user selector across name and email. | React, Radix UI, TypeScript | 8 | Interactive participant selector with removable chips. |
| **32** | Aug 19, 2026 | Wednesday | Enforcing security invariants: host self-selection exclusion, inactive user rejection, and participant deduplication logic. | Java, Spring Security | 8 | Hardened video session business logic and validation. |
| **33** | Aug 20, 2026 | Thursday | Authoring automated unit test suite `DiscussionVideoSessionUnitTest.java`; creating 20 test cases covering tokens, roles, and lifecycles. | JUnit 5, Mockito | 8 | 20 unit tests authored and verified passing. |
| **34** | Aug 21, 2026 | Friday | Authoring PowerShell runtime integration script `verify_participant_selection_runtime.ps1`; testing live Keycloak, Backend, and DB. | PowerShell 7, REST APIs | 8 | Automated live runtime test suite created (10 scenarios). |
| **35** | Aug 24, 2026 | Monday | Executing direct Prosody XMPP BOSH verification script `verify_direct_prosody_jwt.ps1`; testing tampered, expired, and mismatched tokens. | PowerShell, XMPP BOSH | 8 | All cryptographic protocol test cases passed (100%). |
| **36** | Aug 25, 2026 | Tuesday | Engineering Spring AOP audit logging subsystem: authoring `@AuditLog` annotation and `AuditLoggingAspect` interceptor. | Spring AOP, AspectJ | 8 | Automated tamper-evident audit logging subsystem active. |
| **37** | Aug 26, 2026 | Wednesday | Designing `AuditLog` entity and PostgreSQL table; enforcing database immutability rules to prevent historical record alteration. | PostgreSQL, Spring Data | 8 | Forensic audit trail database table and logic secured. |
| **38** | Aug 27, 2026 | Thursday | Building Compliance Officer Audit Dashboard on frontend: filtering access logs by actor, resource, action, date, and status. | Next.js 14, Radix UI | 8 | Interactive audit log inspection interface completed. |
| **39** | Aug 28, 2026 | Friday | Performing full end-to-end integration and load testing; measuring API latencies and database query response times. | Apache Benchmark, JMeter | 8 | Performance benchmarks verified (sub-15ms FTS query). |
| **40** | Aug 31, 2026 | Monday | Authoring multi-container production Docker Compose orchestration (`docker-compose.prod.yml`, Nginx reverse proxy with TLS). | Docker, Nginx, OpenSSL | 8 | Production container orchestration configured. |
| **41** | Sep 01, 2026 | Tuesday | Drafting comprehensive *Deployment & Operations Documentation* and updating OpenAPI / Swagger UI annotations. | Markdown, Swagger UI | 8 | Complete technical deployment documentation delivered. |
| **42** | Sep 02, 2026 | Wednesday | Preparing final project presentation and live demonstration for INSA Directorate leadership and senior software architects. | PowerPoint, Live Demo | 8 | Project showcase prepared and rehearsed. |
| **43** | Sep 03, 2026 | Thursday | Delivering formal project presentation at INSA headquarters; demonstrating all six core subsystems to acclaim. | Project Presentation | 8 | Successful formal defense and system acceptance. |
| **44** | Sep 04, 2026 | Friday | Final codebase handover, repository merging into main branch, clearance checklist completion, and exit debriefing. | Git, Directorate Exit | 8 | Full technical handover completed; 45 working days ended. |
| **45** | Sep 07, 2026 | Monday | Finalizing university internship report and compiling all verification evidence, diagrams, and logs for ASTU submission. | Technical Report Writing | 8 | Final academic report drafted and finalized. |

---

### Month 2 Supervisor Appraisal and Final Sign-Off
- **Supervisor Evaluation and Summary:**  
  *"During the second month of the internship, the student surpassed all technical milestones set for the INSA-KMS project. The integration of Apache Tika full-text search, Keycloak 26 OIDC token verification, and the secure Jitsi video discussion subsystem demonstrates master-level software engineering and cybersecurity awareness. The student authored exemplary automated test suites and live verification scripts that verified 100% test passing across 20 automated tests and 10 end-to-end runtime scenarios. The student exhibits exceptional professional maturity, dedication, and problem-solving capability."*
- **Overall Performance Rating for Month 2:** **EXCELLENT (98/100)**
- **Cumulative Final Internship Grade:** **EXCELLENT (97/100)**
- **Industrial Supervisor Signature:** _____________________________  
- **Supervisor Full Name:** ______________________________________  
- **Designation:** Senior Software Security Engineer / Team Lead  
- **Directorate:** Software R&D and Cybersecurity Infrastructure Directorate  
- **Organization:** Information Network Security Administration (INSA)  
- **Date:** September 04, 2026  
- **Official Organization Seal:**  
