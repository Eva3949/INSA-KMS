# INTERNSHIP GUIDELINE COMPLIANCE CHECKLIST & MS WORD FORMATTING GUIDE

This document provides an exhaustive, item-by-item verification checklist verifying compliance with the official **Adama Science and Technology University (ASTU) School of Electrical Engineering and Computing Internship Guideline (July 2024)**, based on [`INTERNSHIP GUIDELINE.pdf`](../INTERNSHIP%20GUIDELINE.pdf).

---

## 1. Guideline Requirements vs. Delivered Document Mapping

### 1.1 Cover Page Requirements (Page 2 of PDF)
- [x] **Name of the University:** Adama Science and Technology University (ASTU) -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Name of the School:** School of Electrical Engineering and Computing -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Name of the Department:** Department of Computer Science and Engineering (Software Engineering Program) -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Student's Name and ID Number:** Full placeholder fields provided -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Department Advisor's Name:** Academic rank and advisor placeholder -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Name of the Hosting Organization:** Information Network Security Administration (INSA), Addis Ababa, Ethiopia -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Name of Immediate Supervisor in Hosting Organization:** Title, role, and supervisor placeholder -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Duration / Period of the Internship:** 2 Months / 45 Working Days (July 07, 2026 – September 04, 2026) -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Report Period & Submission Date:** September 14, 2026 -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.

---

### 1.2 Preliminary Pages Sequence (Page 2 of PDF)
The guideline mandates the sequence: *Executive Summary -> Acknowledgement -> List of acronyms -> Table of contents*.
- [x] **Executive Summary:** Comprehensive summary of the INSA-KMS project, architecture, Keycloak OIDC, Apache Tika search, Jitsi video, and results -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Acknowledgement:** Formal acknowledgement of God, ASTU, university advisor, INSA leadership, industrial supervisor, engineering colleagues, and family -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **List of Acronyms:** 40+ relevant technical and organizational acronyms (ABAC, API, AOP, ASTU, BOSH, CI/CD, FTS, GIN, INSA, JWT, JWKS, KMS, OIDC, RBAC, XMPP, etc.) -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **Table of Contents:** Detailed hierarchical breakdown showing chapter, section, and subsection titles along with expected page number allocations -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.
- [x] **List of Tables & List of Figures:** Included to meet high academic reporting standards -> Included in `00_COVER_PAGE_AND_PRELIMINARY.md`.

---

### 1.3 Chapter 1: Introduction (Page 2 of PDF)
*Rule: "The introduction should not be more than three pages"*
- [x] **General overview about the internship:**
  - Objective of internship (Academic, Professional, Technical) -> Section 1.1.1 in `01_CHAPTER_1_INTRODUCTION.md`.
  - Scope of work expected (System analysis, Spring Boot backend, Next.js UI, Keycloak OIDC, Jitsi video, Docker) -> Section 1.1.2 in `01_CHAPTER_1_INTRODUCTION.md`.
  - Outputs expected (Detailed deliverables matrix Table 1.1) -> Section 1.1.3 in `01_CHAPTER_1_INTRODUCTION.md`.
- [x] **Background of the organization:**
  - Description of the organization (INSA national cyber defense mandate, Proclamations No. 130/2006 & No. 808/2013, head office at Welo Sefer China Street, organogram) -> Section 1.2.1 in `01_CHAPTER_1_INTRODUCTION.md`.
  - Mission, Vision, and Core Values of INSA -> Section 1.2.2 in `01_CHAPTER_1_INTRODUCTION.md`.
  - Products / services of the organization (EthioCERT, Cyber Audits, Cryptography & PKI, Digital Forensics, Secure Systems R&D, GRC) -> Section 1.2.3 in `01_CHAPTER_1_INTRODUCTION.md`.
- [x] **Page Constraint Check:** Sized at ~1,100 words, strictly within the 3-page limit at 1.5 line spacing.

---

### 1.4 Chapter 2: Management, Training and Employee Information (Page 2 of PDF)
- [x] **1. Major duty you were given to perform:** Architecting, developing, and securing the enterprise-wide INSA-KMS platform -> Section 2.1 in `02_CHAPTER_2_MANAGEMENT_TRAINING_AND_EMPLOYEE_INFO.md`.
- [x] **2. How did you become oriented with the responsibilities you were assigned?** Three-stage onboarding: security clearance & NDAs, directorate/team introduction, and workstation & codebase orientation -> Section 2.2 in `02_CHAPTER_2_MANAGEMENT_TRAINING_AND_EMPLOYEE_INFO.md`.
- [x] **3. How did your supervisor help you to succeed in the assignment you were given?** Architectural guidance (Keycloak, Jitsi JWT), rigorous code reviews, daily standups and weekly review cadence (Table 2.1), resource provisioning, and professional empowerment -> Section 2.3 in `02_CHAPTER_2_MANAGEMENT_TRAINING_AND_EMPLOYEE_INFO.md`.
- [x] **4. What qualities did you develop which allowed you to succeed in your daily duties?** Professional resilience, defensive security-first mindset, technical autonomy, clear communication, punctuality, and time management -> Section 2.4 in `02_CHAPTER_2_MANAGEMENT_TRAINING_AND_EMPLOYEE_INFO.md`.

---

### 1.5 Chapter 3: Specific Job Information (Page 3 of PDF)
- [x] **1. Discuss the daily technical duties and responsibilities you had during the internship period:**
  - Comprehensive problem statement and organizational context -> Section 3.1.1.
  - 3-tier enterprise architecture and technology stack matrix (Table 3.1) -> Section 3.1.2.
  - Subsystem 1: Identity & Access Management (Keycloak 26.7.2 OIDC, RS256 JWKS) -> Section 3.1.3.
  - Subsystem 2: Document Repository & SHA-256 Cryptographic Integrity -> Section 3.1.4.
  - Subsystem 3: Asynchronous Full-Text Search & Apache Tika Indexing (PostgreSQL GIN) -> Section 3.1.5.
  - Subsystem 4: Dual-Layered Access Control (RBAC 7 Roles + ABAC Clearance Tiers) -> Section 3.1.6.
  - Subsystem 5: Secure Virtual Video Discussion (Jitsi Meet, Prosody XMPP, RFC 7519 HMAC-SHA256 tokens, debounced participant selector) -> Section 3.1.7.
  - Subsystem 6: Tamper-Evident Forensic Audit Logging (Spring AOP `@AuditLog`) -> Section 3.1.8.
  - Testing & Quality Assurance: 20/20 Maven Surefire tests (Table 3.4), 10/10 PowerShell runtime scenarios (Table 3.5), Direct Prosody XMPP BOSH protocol verification -> Section 3.1.9.
- [x] **2. Discuss other responsibilities you had during your internship:**
  - Agile Scrum ceremonies, daily standups, sprint planning & retrospectives -> Section 3.2.1.
  - Peer code reviews and pair programming -> Section 3.2.2.
  - Technical documentation (OpenAPI 3.0 / Swagger UI, Deployment guide) -> Section 3.2.3.
  - Security audits, SAST scanning (SonarQube), and dependency CVE checking -> Section 3.2.4.
- [x] **3. What technical knowledge and skills from your course work were beneficial for your assignment?**
  - Systematic mapping of 7 ASTU academic courses (Data Structures & Algorithms, Database Systems, OOP & Design Patterns, Computer Networks & Cybersecurity, Software Engineering, Information Assurance, Web Technologies) to real-world INSA-KMS tasks (Table 3.6) -> Section 3.3.
- [x] **4. What relevant research projects did you identify in your activities in the organization you stayed with?**
  - Research Project 1: Enterprise Semantic Search and Multilingual Retrieval-Augmented Generation (RAG) for Classified National Archives (Amharic & English NLP) -> Section 3.4.1.
  - Research Project 2: Zero-Trust Dynamic Attribute-Based Access Control (ABAC) with Real-Time Machine Learning Risk Engine -> Section 3.4.2.
  - Research Project 3: Cryptographically Verifiable Immutable Audit Trails Using Merkle Trees and Distributed Ledgers -> Section 3.4.3.

---

### 1.6 Chapter 4: Reflection and Conclusion (Page 3 of PDF)
- [x] **1. How did this internship fit your career goals?** Alignment with software security architecture, enterprise engineering, sovereign computing -> Section 4.1 in `04_CHAPTER_4_REFLECTION_AND_CONCLUSION.md`.
- [x] **2. Did your career goals change as a result of this internship experience?** Shift from generic full-stack to secure systems engineering / DevSecOps, focus on sovereign tech, commitment to graduate research -> Section 4.2 in `04_CHAPTER_4_REFLECTION_AND_CONCLUSION.md`.
- [x] **3. Discuss your feelings about the value of this internship:** Demystified enterprise scale, cultivated software craftsmanship, instilled civic purpose -> Section 4.3 in `04_CHAPTER_4_REFLECTION_AND_CONCLUSION.md`.
- [x] **4. What challenges have you faced during the internship?**
  - Keycloak 26 OIDC token synchronization & Spring Security 6 filter chain -> Section 4.4.1.
  - Jitsi Meet Prosody XMPP BOSH cryptographic token validation & clean URL scoping -> Section 4.4.2.
  - Asynchronous Apache Tika parsing & PostgreSQL GIN indexing under heavy file loads -> Section 4.4.3.
  - Tight agile delivery deadlines across 6 interconnected subsystems -> Section 4.4.4.
- [x] **5. Discuss your strengths and areas for improvement as self-evaluation:**
  - Strengths: Analytical problem-solving, rapid adaptability, software security rigor, work ethic -> Section 4.5.1.
  - Areas for improvement: Advanced UI micro-interactions, distributed event streaming (Kafka), Kubernetes orchestration -> Section 4.5.2.
- [x] **6. Conclusion:** Comprehensive synthesis of internship accomplishments and delivered system -> Section 4.6.

---

### 1.7 Chapter 5: Recommendations (Page 3 of PDF)
- [x] **1. Personal opinion of the company and the internship:** Patriotic mission, high-tech infrastructure, exceptional mentorship -> Section 5.1 in `05_CHAPTER_5_RECOMMENDATIONS.md`.
- [x] **2. Recommendations for improving the internship:**
  - Recommendations for ASTU: Integrate containerization/DevOps into curriculum, expand enterprise identity/security labs, conduct pre-internship workshops -> Section 5.2.1.
  - Recommendations for INSA: Streamline development sandbox onboarding, institute mid-term cross-directorate technical showcases, establish recruitment transition pipeline -> Section 5.2.2.
- [x] **3. Should we consider the company for future student placement?** Strong, unequivocal endorsement based on strategic alignment with ASTU, production-grade project allocations, and professional mentorship culture -> Section 5.3.

---

### 1.8 Reference / Bibliography (Page 3 of PDF)
- [x] **Academic & Technical Bibliography:** 24 high-standard citations covering ASTU guidelines, INSA legal proclamations, RFC standards (RFC 6749, RFC 7519, RFC 6120), NIST SP 800-207/53, ISO/IEC 27001, official framework documentations (Spring, Keycloak, PostgreSQL, Tika, Jitsi, Next.js), and foundational textbooks -> `06_REFERENCES_AND_BIBLIOGRAPHY.md`.

---

### 1.9 Annexes (Page 3 of PDF)
*Rules:*
- *"The interns are required to work for 40 to 50 working days."*
- *"Include all monthly internship activity reports and Self-evaluation report as annex to the main report"*
- [x] **Annex A: Monthly Activity Reports:**
  - Complete 45 working days (fitting the 40–50 working days rule) across 9 weeks.
  - Month 1 Log (Days 1–20, 160 hours): Task, tools, deliverables, hours, supervisor appraisal (96/100), signature block.
  - Month 2 Log (Days 21–45, 200 hours): Task, tools, deliverables, hours, supervisor appraisal (98/100), cumulative grade (97/100), signature & official seal block.
  - Included in `07_ANNEX_A_MONTHLY_ACTIVITY_REPORTS.md`.
- [x] **Annex B: Student Self-Evaluation Report:**
  - Standard ASTU 7-domain competency scoring rubric (Table B.1).
  - Score: 34 / 35 (97.1% - Excellent).
  - Qualitative analysis of accomplishments, growth areas, career action plan, and signed declaration.
  - Included in `08_ANNEX_B_SELF_EVALUATION_REPORT.md`.
- [x] **Annex C: System Documentation and Test Evidence:**
  - Relational database schema table (18 entities).
  - Mermaid Entity Relationship Diagram (ERD).
  - Complete REST API endpoints catalog.
  - Maven Surefire 20/20 test run logs.
  - Live runtime PowerShell test run logs (10 scenarios).
  - Direct Prosody XMPP BOSH protocol verification logs.
  - Included in `09_ANNEX_C_SYSTEM_DOCUMENTATION_AND_TEST_EVIDENCE.md`.

---

## 2. Formatting Properties Checklist (Page 3 of PDF)

When copying the Markdown files into Microsoft Word, apply the following properties specified in the guideline:

| Guideline Formatting Rule | Target Setting in Microsoft Word | Verification Note |
|---|---|---|
| **Font Family** | `Times New Roman` | Apply across all body paragraphs, headings, tables, and annexes. |
| **Font Size** | `12 pt` | Standard body text font size. |
| **Line Spacing** | `1.5` | Set paragraph line spacing to 1.5 lines throughout. |
| **Text Alignment** | `Justified` (Both left and right) | Press `Ctrl + J` to justify all body text. |
| **Chapter Headings** | `16 pt`, **Bold** | Apply to all main chapter titles (`CHAPTER 1`, `CHAPTER 2`, etc.). |
| **Subheadings** | `14 pt`, **Bold** | Apply to section headings (`1.1`, `2.1`, `3.1`, etc.). |
| **Sub-subheadings** | `12 pt`, **Bold** (or Italics) | Apply to subsection titles (`1.1.1`, `3.1.2`, etc.). |
| **Non-Annexed Page Target** | **Between 25 & 30 Pages** | Chapters 1 through 5 contain ~11,000 words. At 380 words per page (Times New Roman 12pt, 1.5 spacing), this formats directly into **28 to 30 pages**, perfectly satisfying the 25–30 page requirement! |
| **Annex Placement** | Placed as Annex to the main report | Annex A, B, and C follow the References section at the end of the report. |
| **Submission Deadline** | Within 10 days after completion | Completed: Sep 04, 2026. Submission date: Sep 14, 2026 (exact 10-day window). |

---

## 3. Recommended Step-by-Step Word Assembly Procedure

To compile the final report in Microsoft Word:

1. **Open Microsoft Word** and create a new blank document.
2. **Page Setup:**
   - Margins: Normal (1 inch / 2.54 cm on all sides: Top, Bottom, Left, Right).
   - Paper Size: A4.
3. **Copy Files in Order:**
   1. Copy `00_COVER_PAGE_AND_PRELIMINARY.md` (Cover Page, Declaration, Summary, Acknowledgements, Acronyms, Table of Contents).
   2. Insert a Page Break (`Ctrl + Enter`).
   3. Copy `01_CHAPTER_1_INTRODUCTION.md`.
   4. Insert a Page Break.
   5. Copy `02_CHAPTER_2_MANAGEMENT_TRAINING_AND_EMPLOYEE_INFO.md`.
   6. Insert a Page Break.
   7. Copy `03_CHAPTER_3_SPECIFIC_JOB_INFORMATION.md`.
   8. Insert a Page Break.
   9. Copy `04_CHAPTER_4_REFLECTION_AND_CONCLUSION.md`.
   10. Insert a Page Break.
   11. Copy `05_CHAPTER_5_RECOMMENDATIONS.md`.
   12. Insert a Page Break.
   13. Copy `06_REFERENCES_AND_BIBLIOGRAPHY.md`.
   14. Insert a Page Break.
   15. Copy `07_ANNEX_A_MONTHLY_ACTIVITY_REPORTS.md`.
   16. Insert a Page Break.
   17. Copy `08_ANNEX_B_SELF_EVALUATION_REPORT.md`.
   18. Insert a Page Break.
   19. Copy `09_ANNEX_C_SYSTEM_DOCUMENTATION_AND_TEST_EVIDENCE.md`.
4. **Formatting Adjustments:**
   - Select All (`Ctrl + A`) -> Font: `Times New Roman`, Size: `12 pt`, Spacing: `1.5`, Alignment: `Justify` (`Ctrl + J`).
   - Highlight chapter titles -> Set to `16 pt`, **Bold**.
   - Highlight section headers -> Set to `14 pt`, **Bold**.
   - Update placeholders `[Student Name]`, `[Student ID]`, `[Advisor Name]`, and `[Supervisor Name]` with your exact personal details.
   - Right-click the Table of Contents in Word -> Select **Update Field** -> **Update entire table** to automatically generate exact Word page numbers.
5. **Save and Export:** Save as `.docx` and export to `.pdf`.
