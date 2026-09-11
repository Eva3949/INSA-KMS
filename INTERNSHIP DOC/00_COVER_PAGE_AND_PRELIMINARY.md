# ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY
## SCHOOL OF ELECTRICAL ENGINEERING AND COMPUTING
### DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
#### PROGRAM: B.Sc. IN SOFTWARE ENGINEERING

---

\
\
\

# FINAL INTERNSHIP REPORT
## DESIGN AND IMPLEMENTATION OF AN ENTERPRISE KNOWLEDGE MANAGEMENT SYSTEM (INSA-KMS) WITH FEDERATED OIDC AUTHENTICATION AND SECURE REAL-TIME COLLABORATION

\
\
\

### HOSTING ORGANIZATION:
**Information Network Security Administration (INSA)**  
Addis Ababa, Ethiopia  
Website: https://www.insa.gov.et/  

\
\

**Prepared By:**
- **Student Name:** [Student Name / e.g., Tewodros Tarekegn / Samuel]
- **Student ID:** [UGR/XXXXX/XX]
- **Department:** Computer Science and Engineering (Software Engineering)

\

**Supervised By:**
- **Hosting Organization Immediate Supervisor:** [Supervisor Name, Title, Directorate/Division, INSA]
- **University Department Advisor:** [Advisor Name, Academic Rank, Dept. of CSE, ASTU]

\

**Internship Period:**
- **Duration:** 2 Months (45 Working Days)
- **Internship Dates:** July 07, 2026 – September 04, 2026
- **Submission Date:** September 14, 2026
- **Location:** Adama, Ethiopia

---

\newpage

## DECLARATION AND APPROVAL

### Student Declaration
I, the undersigned, declare that this internship report titled **"Design and Implementation of an Enterprise Knowledge Management System (INSA-KMS) with Federated OIDC Authentication and Secure Real-Time Collaboration"** is my original work developed during my two-month internship tenure (July 07, 2026 – September 04, 2026) at the **Information Network Security Administration (INSA)**, Addis Ababa, Ethiopia. This report is submitted to the Department of Computer Science and Engineering, School of Electrical Engineering and Computing, Adama Science and Technology University (ASTU), in partial fulfillment of the academic requirements for the Degree of Bachelor of Science in Software Engineering. All sources, literary citations, and technical frameworks utilized in this work have been properly acknowledged.

**Student Name:** ______________________________________  
**Signature:** _________________________________________  
**Date:** _____________________________________________  

---

### Hosting Organization Immediate Supervisor Approval
This is to certify that the above student has satisfactorily completed their two-month industrial internship training at the Information Network Security Administration (INSA) under my direct technical supervision. The student was assigned to the software engineering team working on the Enterprise Knowledge Management System (INSA-KMS). The technical contributions, duties, and project achievements described in this report accurately reflect the student's work and dedication.

**Supervisor Name:** ___________________________________  
**Title / Role:** Senior Software Security Engineer / Team Lead  
**Department / Directorate:** Software R&D and Cybersecurity Infrastructure Directorate  
**Organization:** Information Network Security Administration (INSA)  
**Signature:** _________________________________________  
**Date:** _____________________________________________  
**Official Stamp:**  

---

### University Department Advisor Approval
This internship report has been submitted to the Department of Computer Science and Engineering, School of Electrical Engineering and Computing, Adama Science and Technology University, with my approval as the academic supervisor.

**Advisor Name:** ______________________________________  
**Academic Rank:** Assistant Professor / Lecturer  
**Department:** Computer Science and Engineering  
**Signature:** _________________________________________  
**Date:** _____________________________________________  

---

\newpage

## EXECUTIVE SUMMARY

Knowledge assets within national security and critical information infrastructure institutions represent vital strategic capital. In large-scale, security-sensitive organizations such as the **Information Network Security Administration (INSA)**, technical intelligence, research papers, vulnerability reports, architectural baselines, standard operating procedures (SOPs), and compliance policies are continuously generated across disparate directorates. However, fragmented storage across disconnected file servers, local drives, email attachments, and ad-hoc chat channels introduces severe operational vulnerabilities, including institutional knowledge leakage during staff attrition, version dissonance, redundant analytical effort, and non-compliance with national data classification mandates.

To address these challenges, this two-month internship project focused on the end-to-end engineering, hardening, and deployment of the **INSA Knowledge Management System (INSA-KMS)**. INSA-KMS is a resilient, enterprise-grade digital repository, semantic search platform, and secure real-time collaboration ecosystem designed specifically for internal organizational use.

The technical architecture is built upon a modular 3-tier topology:
1. **Frontend Presentation Tier:** Engineered using **Next.js 14** (React 18, TypeScript, Tailwind CSS, Radix UI), featuring responsive document libraries, dynamic file explorer trees, built-in PDF.js canvas previewing, debounced multi-user collaboration selectors, and real-time status telemetry.
2. **Backend Services Tier:** Built on **Spring Boot 3.3** (Java 21, Maven), exposing a robust suite of RESTful microservices. The backend implements Spring Security as an **OAuth2 Resource Server** validating cryptographically signed RS256 JSON Web Tokens (JWT) from an enterprise **Keycloak 26.7.2** identity broker, enforcing strict Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) based on organizational clearance levels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`). Content ingestion features automated cryptographic integrity hashing (SHA-256) and an asynchronous **Apache Tika** parsing pipeline for full-text extraction.
3. **Data and Streaming Persistence Tier:** Powered by **PostgreSQL 15** with customized GIN (Generalized Inverted Index) indexing on `tsvector` structures for sub-second full-text search across millions of words. Real-time video conferencing is facilitated via a containerized **Jitsi Meet / Prosody XMPP** cluster secured by short-lived HMAC-SHA256 JWT tokens with fail-closed room isolation.
4. **Audit and Governance Subsystem:** Implemented via Spring Aspect-Oriented Programming (AOP), intercepting every state mutation to log immutable, tamper-evident audit events (Actor UUID, Timestamp, IP Address, Action, Resource, Status).

During the 45 working days of the internship, rigorous testing methodologies were applied, including 20 automated JUnit 5/Mockito integration test suites (100% pass rate), end-to-end PowerShell integration verifications across running Keycloak, Spring Boot, and PostgreSQL containers, and direct RFC 7519 XMPP BOSH protocol validations against the Prosody server.

This report documents the organizational context of INSA, orientation experiences, software engineering methodologies, detailed technical designs, implementation workflows, academic knowledge mapping, personal reflections, self-evaluation, and strategic recommendations for ASTU and INSA.

---

\newpage

## ACKNOWLEDGEMENT

First and foremost, I express my deepest gratitude to the Almighty God for providing me with health, wisdom, perseverance, and guidance throughout my academic studies and the execution of this challenging internship project.

I extend my sincere appreciation to **Adama Science and Technology University (ASTU)**, specifically the **School of Electrical Engineering and Computing (SoEEC)** and the **Department of Computer Science and Engineering**, for equipping me with the strong theoretical foundation, algorithmic discipline, and engineering problem-solving mindset necessary to contribute effectively to national-scale software projects. Special thanks go to my university department advisor for continuous academic guidance, valuable feedback, and constructive critiques throughout the internship tenure.

I am immensely grateful to the leadership and technical staff of the **Information Network Security Administration (INSA)** of Ethiopia for granting me the rare privilege to serve as a Software Engineering Intern within their specialized cybersecurity and software development directorate. 

My profound appreciation goes to my industrial supervisor at INSA, whose technical mentorship, patient code reviews, deep architectural insights, and high standards for software security profoundly elevated my software craftsmanship. His willingness to discuss complex topics—from OAuth2/OIDC token exchanges and XMPP BOSH protocol handshakes to PostgreSQL indexing strategies—greatly broadened my professional horizons.

I also express heartfelt gratitude to the entire INSA engineering team and fellow colleagues for welcoming me into their collaborative agile environment, offering continuous assistance, and sharing their valuable industry experiences.

Finally, I dedicate my warmest thanks to my family and friends for their unconditional love, moral encouragement, emotional support, and understanding during intensive project delivery phases.

---

\newpage

## LIST OF ACRONYMS

| Acronym | Full Meaning |
|---|---|
| **ABAC** | Attribute-Based Access Control |
| **API** | Application Programming Interface |
| **AOP** | Aspect-Oriented Programming |
| **ASTU** | Adama Science and Technology University |
| **BOSH** | Bidirectional-streams Over Synchronous HTTP |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **CII** | Critical Information Infrastructure |
| **CIIP** | Critical Information Infrastructure Protection |
| **CPU** | Central Processing Unit |
| **CSE** | Computer Science and Engineering |
| **CSS** | Cascading Style Sheets |
| **DBMS** | Database Management System |
| **DDL** | Data Definition Language |
| **DTO** | Data Transfer Object |
| **ERD** | Entity Relationship Diagram |
| **FTS** | Full-Text Search |
| **GIN** | Generalized Inverted Index |
| **GRC** | Governance, Risk, and Compliance |
| **HTML** | HyperText Markup Language |
| **HTTP** | HyperText Transfer Protocol |
| **HTTPS** | HyperText Transfer Protocol Secure |
| **IDE** | Integrated Development Environment |
| **INSA** | Information Network Security Administration |
| **IoC** | Inversion of Control |
| **JPA** | Java Persistence API |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **JWKS** | JSON Web Key Set |
| **KMS** | Knowledge Management System |
| **MVC** | Model-View-Controller |
| **NFR** | Non-Functional Requirement |
| **OIDC** | OpenID Connect |
| **ORM** | Object-Relational Mapping |
| **OS** | Operating System |
| **PKI** | Public Key Infrastructure |
| **RAG** | Retrieval-Augmented Generation |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RFC** | Request For Comments |
| **SASL** | Simple Authentication and Security Layer |
| **SDLC** | Software Development Life Cycle |
| **SHA** | Secure Hash Algorithm |
| **SoEEC** | School of Electrical Engineering and Computing |
| **SOP** | Standard Operating Procedure |
| **SQL** | Structured Query Language |
| **SSO** | Single Sign-On |
| **TLS** | Transport Layer Security |
| **UI** | User Interface |
| **URI** | Uniform Resource Identifier |
| **URL** | Uniform Resource Locator |
| **UUID** | Universally Unique Identifier |
| **UX** | User Experience |
| **XMPP** | Extensible Messaging and Presence Protocol |

---

\newpage

## TABLE OF CONTENTS

```text
COVER PAGE .................................................................... i
DECLARATION AND APPROVAL ..................................................... ii
EXECUTIVE SUMMARY ........................................................... iii
ACKNOWLEDGEMENT .............................................................. iv
LIST OF ACRONYMS .............................................................. v
TABLE OF CONTENTS ............................................................ vi
LIST OF TABLES ............................................................. viii
LIST OF FIGURES .............................................................. ix

CHAPTER 1: INTRODUCTION ...................................................... 1
  1.1 General Overview About the Internship ................................... 1
      1.1.1 Objectives of the Internship ..................................... 1
      1.1.2 Scope of Work Expected ........................................... 2
      1.1.3 Outputs Expected ................................................. 2
  1.2 Background of the Hosting Organization ................................. 3
      1.2.1 Description of INSA .............................................. 3
      1.2.2 Mission, Vision, and Core Values of INSA .......................... 3
      1.2.3 Products and Services of INSA .................................... 3

CHAPTER 2: MANAGEMENT, TRAINING, AND EMPLOYEE INFORMATION ..................... 4
  2.1 Major Duty Assigned to Perform .......................................... 4
  2.2 Orientation and Workplace Integration ................................... 5
  2.3 Supervisory Guidance and Mentorship Support ............................. 6
  2.4 Professional Qualities and Skills Developed ............................ 7

CHAPTER 3: SPECIFIC JOB INFORMATION ........................................... 9
  3.1 Daily Technical Duties and Responsibilities ............................. 9
      3.1.1 Problem Statement and Context of INSA-KMS ......................... 9
      3.1.2 Architectural Framework and System Topology ...................... 10
      3.1.3 Subsystem 1: Identity and Access Management (Keycloak OIDC) ...... 11
      3.1.4 Subsystem 2: Document Repository and Lifecycle Management ........ 13
      3.1.5 Subsystem 3: Full-Text Search and Apache Tika Indexing ........... 14
      3.1.6 Subsystem 4: Role-Based and Attribute-Based Access Control ....... 16
      3.1.7 Subsystem 5: Secure Virtual Video Discussion and Jitsi Meet ...... 17
      3.1.8 Subsystem 6: Automated Tamper-Evident Audit Logging .............. 19
      3.1.9 Testing, Quality Assurance, and Runtime Verification ............. 20
  3.2 Other Responsibilities During the Internship ........................... 21
  3.3 Application of ASTU Coursework Knowledge ............................... 21
  3.4 Relevant Research Projects Identified at INSA .......................... 22

CHAPTER 4: REFLECTION AND CONCLUSION ......................................... 24
  4.1 Alignment with Career Goals ............................................ 24
  4.2 Evolution of Career Goals .............................................. 24
  4.3 Feelings About the Value of the Internship ............................. 25
  4.4 Technical and Professional Challenges Faced ............................ 25
  4.5 Self-Evaluation of Strengths and Areas for Improvement ................. 26
  4.6 Conclusion ............................................................. 27

CHAPTER 5: RECOMMENDATIONS ................................................... 28
  5.1 Personal Opinion of the Hosting Organization and Internship ............ 28
  5.2 Recommendations for Improving the Internship Program ................... 28
  5.3 Consideration of INSA for Future Student Placement ..................... 28

REFERENCES / BIBLIOGRAPHY .................................................... 29

ANNEXES (Separate from Main Report Page Count) ............................... 31
  ANNEX A: MONTHLY INTERNSHIP ACTIVITY REPORTS (45 WORKING DAYS) ............. 31
  ANNEX B: STUDENT INTERNSHIP SELF-EVALUATION REPORT ......................... 43
  ANNEX C: SYSTEM ARCHITECTURE, DATABASE SCHEMA, AND TEST EVIDENCE ........... 47
```

---

\newpage

## LIST OF TABLES

| Table Number | Table Caption | Page |
|---|---|---|
| **Table 1.1** | Expected Internship Deliverables and Verification Artifacts | 3 |
| **Table 2.1** | Weekly Supervisory Mentorship and Review Cadence | 9 |
| **Table 3.1** | Technology Stack Matrix for INSA-KMS | 13 |
| **Table 3.2** | Keycloak Enterprise Realm Roles and Authorization Permissions | 21 |
| **Table 3.3** | Document Security Classification Matrix (ABAC Clearance) | 22 |
| **Table 3.4** | Summary of 20 Automated Unit and Integration Tests | 28 |
| **Table 3.5** | End-to-End Live Runtime Integration Test Results (10 Scenarios) | 29 |
| **Table 3.6** | Mapping of ASTU Academic Courses to Industrial Project Tasks | 32 |
| **Table A.1** | Month 1 Internship Activity Log (Weeks 1 – 4, Days 1 – 20) | 54 |
| **Table A.2** | Month 2 Internship Activity Log (Weeks 5 – 9, Days 21 – 45) | 60 |
| **Table B.1** | ASTU Student Internship Self-Evaluation Scoring Rubric | 66 |
| **Table C.1** | Core Database Entities and Relational Schema Definition | 71 |
| **Table C.2** | RESTful API Endpoints Catalog for INSA-KMS | 74 |

---

\newpage

## LIST OF FIGURES

| Figure Number | Figure Caption | Page |
|---|---|---|
| **Figure 1.1** | Organizational Structure and Key Directorates of INSA | 5 |
| **Figure 3.1** | High-Level 3-Tier Enterprise Architecture of INSA-KMS | 13 |
| **Figure 3.2** | OpenID Connect (OIDC) Authorization Code Flow with Keycloak 26 | 15 |
| **Figure 3.3** | Asynchronous Document Ingestion, SHA-256 Hashing, and Tika FTS Pipeline | 19 |
| **Figure 3.4** | Secure Jitsi Meet Video Session Lifecycle and HMAC-SHA256 Token Flow | 24 |
| **Figure 3.5** | Spring AOP Tamper-Evident Audit Logging Interceptor Architecture | 26 |
| **Figure C.1** | Entity Relationship Diagram (ERD) of the KMS PostgreSQL Database | 72 |
| **Figure C.2** | Maven Surefire Test Execution Output (20/20 Passed) | 76 |
| **Figure C.3** | Direct Prosody XMPP BOSH Cryptographic Handshake Verification | 77 |
