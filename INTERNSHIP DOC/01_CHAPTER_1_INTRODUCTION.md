# CHAPTER 1: INTRODUCTION

---

## 1.1 General Overview About the Internship

Industrial internship training is a vital cornerstone of the engineering curriculum at **Adama Science and Technology University (ASTU)** under the **School of Electrical Engineering and Computing (SoEEC)**. The program bridges classroom theoretical instruction with real-world, production-grade enterprise software engineering. 

During this two-month internship (45 working days, July 07 – September 04, 2026) at the **Information Network Security Administration (INSA)** in Addis Ababa, Ethiopia, I was assigned to the Software R&D and Cybersecurity Infrastructure Directorate. My primary duty was the design, implementation, and security hardening of the **Enterprise Knowledge Management System (INSA-KMS)**—a sovereign digital repository, full-text search engine, and secure real-time collaboration ecosystem designed to safeguard institutional memory across INSA directorates.

### 1.1.1 Objectives of the Internship

The internship encompassed three complementary dimensions:

1. **Academic Objectives:** Apply university computer science principles—object-oriented design, relational database normalization (3NF), software engineering lifecycles, and cryptographic algorithms—to production software engineering under enterprise constraints.
2. **Professional Objectives:** Cultivate professional engineering ethics, agile teamwork (daily standups, sprint planning, peer code reviews), and strict adherence to national cybersecurity compliance standards.
3. **Technical Objectives:** 
   - Architect a modular 3-tier enterprise Knowledge Management System;
   - Implement federated OpenID Connect (OIDC) authentication using **Keycloak 26.7.2** with asymmetric RS256 JWT validation;
   - Build an asynchronous document ingestion pipeline using **Apache Tika** and **PostgreSQL 15 Full-Text Search (FTS)** with Generalized Inverted Indexes (GIN);
   - Integrate an on-premise, encrypted **Jitsi Meet / Prosody XMPP** video collaboration subsystem with fail-closed HMAC-SHA256 token room admission;
   - Establish tamper-evident audit logging via Spring Aspect-Oriented Programming (AOP).

### 1.1.2 Scope of Work Expected

The expected scope spanned the full software development lifecycle (SDLC):
- **Requirements Engineering:** Translating INSA document governance policies and data classifications (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) into formal functional specifications.
- **Backend Engineering:** Developing modular Spring Boot 3.3 microservices with Spring Security OAuth2 resource servers, transactional JPA entities, and RESTful APIs.
- **Frontend Development:** Engineering an accessible, responsive Next.js 14 (React 18, TypeScript, Tailwind CSS) client with embedded PDF.js previewing and interactive multi-user selection.
- **Security & Testing:** Authoring automated JUnit 5 test suites, executing live runtime integration verifications, and orchestrating multi-container Docker Compose environments.

### 1.1.3 Outputs Expected

The primary tangible outputs delivered upon completion included:
- **D-1: Hardened Backend API:** Spring Boot 3.3 RESTful engine with OAuth2 resource server validation.
- **D-2: Next.js 14 Web Portal:** Responsive client with document explorer and in-browser PDF canvas previewer.
- **D-3: Keycloak Identity Realm:** Configured `kms-realm` with OIDC clients, custom claims, and 7 RBAC roles.
- **D-4: Full-Text Search Engine:** Asynchronous Apache Tika text extractor paired with PostgreSQL 15 GIN indexing.
- **D-5: Secure Video Collaboration:** Self-hosted Jitsi Meet/Prosody with HMAC-SHA256 token admission.
- **D-6: Tamper-Evident Audit Logging:** Spring AOP aspect capturing immutable, forensic-grade audit trails.
- **D-7: Verification Test Suites:** 20/20 passing JUnit integration tests and live PowerShell runtime verifications.

---

## 1.2 Background of the Hosting Organization

### 1.2.1 Description of INSA

The **Information Network Security Administration (INSA)** is Ethiopia's premier federal cybersecurity, technical intelligence, and cyber defense agency. Established by Council of Ministers Regulation No. 130/2006 and re-established with expanded statutory authority under Proclamation No. 808/2013, INSA is legally mandated to protect Ethiopia's information and critical information infrastructure (CII), ensure national cyber sovereignty, and foster sovereign technological capabilities.

Headquartered on Welo Sefer China Street in Addis Ababa, INSA operates as a high-technology state institution defending national critical infrastructures—telecommunications, financial transaction networks, electrical grids, aviation systems, and government e-services—against cyber warfare, espionage, unauthorized intrusion, and digital sabotage. 

INSA is structured into specialized directorates:
- *Cybersecurity Infrastructure & Operations Directorate (including EthioCERT);*
- *Cryptographic Engineering & Public Key Infrastructure (PKI) Directorate;*
- *Software Research & Development and Systems Engineering Directorate;*
- *Governance, Risk, and Compliance (GRC) & Cyber Auditing Directorate;*
- *Digital Forensics & Cyber Crime Investigation Directorate.*

### 1.2.2 Mission, Vision, and Core Values of INSA

**Vision:**  
*"To realize a secure, resilient, and sovereign Ethiopian cyberspace that empowers sustainable national transformation and technological advancement."*

**Mission:**  
*"To ensure national cyber security by defending information and information infrastructure, building advanced cryptographic and cybersecurity capabilities, conducting technical intelligence, and fostering sovereign digital trust."*

**Core Values:**
- **National Interest Above All:** Unwavering dedication to safeguarding Ethiopia's digital sovereignty.
- **Innovation and Excellence:** Continuous mastery of cutting-edge technologies and sovereign research.
- **Integrity and Confidentiality:** Uncompromising professional ethics, trust, and secrecy.
- **Vigilance and Proactiveness:** Continuous cyber monitoring, threat hunting, and rapid response.
- **Collaboration and Synergy:** Inter-disciplinary teamwork and institutional knowledge transfer.

### 1.2.3 Products and Services of INSA

INSA delivers critical technical services and sovereign digital products:
1. **National Incident Response (EthioCERT):** 24/7 surveillance of national cyberspace, early warning advisories, and emergency cyber incident containment.
2. **Cybersecurity Audits & System Inspection:** Comprehensive penetration testing, vulnerability assessments, and compliance audits against ISO/IEC 27001 and NIST SP 800-53 standards.
3. **Cryptographic Engineering & PKI:** National root certification authority administration, digital signature frameworks, and hardware security module (HSM) deployment.
4. **Digital Forensics & Investigation:** Forensic acquisition, court-admissible evidence preservation, and deep analysis of compromised IT environments.
5. **Secure Software Development:** Hardened enterprise platforms and sovereign defense applications, including the **INSA-KMS** platform engineered during this internship.
6. **Governance, Risk, & Compliance (GRC):** National baseline cybersecurity directives, institutional risk assessments, and specialized capacity-building training.
