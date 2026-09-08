# INSA Knowledge Management System (KMS)
# Complete Production Deployment & Installation Guide

**Document Reference:** `docs/deployment/DEPLOYMENT_DOCUMENTATION.md`  
**System Name:** INSA Enterprise Knowledge Management System (KMS)  
**Version:** 1.0.0-PROD  
**Target Audience:** Enterprise IT Administrators, Systems Engineers, DevOps Engineers, Security Officers  
**Publication Date:** September 2026  
**Document Status:** Approved for Enterprise Production Handover  

---

## Table of Contents

1. [Document Information](#1-document-information)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [System & Hardware Requirements](#3-system--hardware-requirements)
4. [Network & Firewall Requirements](#4-network--firewall-requirements)
5. [Pre-Deployment Checklist](#5-pre-deployment-checklist)
6. [Database Deployment & Initialization](#6-database-deployment--initialization)
7. [Keycloak Identity Provider Deployment & Realm Configuration](#7-keycloak-identity-provider-deployment--realm-configuration)
8. [Backend API Deployment (Spring Boot 3)](#8-backend-api-deployment-spring-boot-3)
9. [Frontend Web Portal Deployment (Next.js 14)](#9-frontend-web-portal-deployment-nextjs-14)
10. [Progressive Web App (PWA) Deployment](#10-progressive-web-app-pwa-deployment)
11. [Reverse Proxy & TLS Gateway Deployment (Nginx)](#11-reverse-proxy--tls-gateway-deployment-nginx)
12. [Self-Hosted Video Conferencing Module (Jitsi Meet WebRTC)](#12-self-hosted-video-conferencing-module-jitsi-meet-webrtc)
13. [Production Environment Variables Reference](#13-production-environment-variables-reference)
14. [Initial System Setup & Administrative Onboarding](#14-initial-system-setup--administrative-onboarding)
15. [Verification & End-to-End Smoke Testing](#15-verification--end-to-end-smoke-testing)
16. [Backup, Restore & Disaster Recovery](#16-backup-restore--disaster-recovery)
17. [Monitoring, Health Checks & Production Logging](#17-monitoring-health-checks--production-logging)
18. [Routine Maintenance & Operational Procedures](#18-routine-maintenance--operational-procedures)
19. [Comprehensive Troubleshooting Guide](#19-comprehensive-troubleshooting-guide)
20. [Production Security Hardening Checklist] (#20-production-security-hardening-checklist)
21. [Rollback & Emergency Recovery Procedures](#21-rollback--emergency-recovery-procedures)
22. [Production Go-Live Sign-Off Checklist](#22-production-go-live-sign-off-checklist)

---

## 1. Document Information

### Purpose
This document provides the definitive, production-grade instructions for installing, configuring, deploying, operating, securing, and maintaining the INSA Enterprise Knowledge Management System (KMS). It is engineered specifically for IT systems administrators who are deploying the system on independent enterprise infrastructure without development team presence.

### Scope
This guide covers both **Docker Containerized Deployment (Recommended)** and **Bare-Metal / Standalone Virtual Machine Deployment**, covering all subsystems:
* **Frontend Portal:** Next.js 14 App Router, React 18, Tailwind CSS, Standalone Output
* **Backend API:** Spring Boot 3.3.4, Java 21 (Eclipse Temurin), Spring Security, Flyway Migrations
* **Database Engine:** PostgreSQL 15+ (Relational Store with 35 Entities)
* **Identity & Access Management:** Keycloak 24.0.1+ OIDC (Quarkus distribution)
* **Ingress Gateway:** Nginx TLS Reverse Proxy with DDoS/Brute-force Rate Limiting
* **Document Binary Storage:** Multi-tier storage with SHA-256 deduplication and optional AES-256-GCM encryption
* **Secure Conferencing (Optional):** Self-hosted Jitsi Meet & Prosody JWT Stack

---

## 2. System Overview & Architecture

The INSA KMS is a secure, classified-ready Enterprise Knowledge Management platform enabling centralized document management, multi-version tracking, granular role-based access control (RBAC), sequential approval workflows, employee knowledge transfer/clearance lifecycles, full-text metadata search, interactive discussions with voice notes, blogs with reactions, legal holds, and retention policies.

### End-to-End Component Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Client User Tier                                      │
│        (Enterprise Desktop Browsers, Installed PWA, Mobile Devices)            │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS (Port 443) / WSS
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Nginx TLS Gateway & Reverse Proxy                          │
│     - TLS 1.2/1.3 Termination, HSTS, Rate Limiting (100 r/s API, 10 r/m Auth)  │
│     - Static Proxy: /, /resources/*, /js/*, /admin/* | API: /api/v1/*           │
└────────────┬───────────────────────────┬───────────────────────────┬────────────┘
             │                           │                           │
   / (Web UI)│                 /api/v1/* │               /realms/*   │
             ▼                           ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│    Next.js Frontend     │ │  Spring Boot API Nodes  │ │   Keycloak 24.0+ OIDC   │
│ (kms-frontend-prod:3000)│ │ (kms-backend-1/2:8081)  │ │ (kms-keycloak-prod:8080)│
│ - Node.js 18+ Standalone│ │ - Java 21 Temurin       │ │ - Realm: kms-realm      │
│ - SSR & Static Shell    │ │ - Stateless JWT Bearer  │ │ - Client: frontend-cli  │
└─────────────────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
                                         │                           │
                                         ├──────────────┬────────────┤
                                         │              │            │
                                         ▼              ▼            ▼
                            ┌─────────────────────┐ ┌─────────────────────────────┐
                            │ Shared Storage Data │ │   PostgreSQL 15 Database    │
                            │ (kms-storage-data)  │ │  - Schema: insakms / kmsdb  │
                            │ - Documents / Media │ │  - Flyway Migrations (V1-39)│
                            │ - Avatars / Voice   │ │  - 35 Relational Entities   │
                            └─────────────────────┘ └─────────────────────────────┘
```

---

## 3. System & Hardware Requirements

### Software Prerequisites

| Component | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / RHEL 9 / Windows Server 2022 | Ubuntu 24.04 LTS / RHEL 9.3 | `uname -a` or `winver` |
| **Docker Engine** | 24.0.0+ | 26.1.0+ | `docker --version` |
| **Docker Compose** | v2.20.0+ | v2.27.0+ | `docker compose version` |
| **Java Development Kit** *(Bare-metal only)* | OpenJDK 21 (LTS) | Eclipse Temurin 21.0.4+ | `java -version` |
| **Node.js Runtime** *(Bare-metal only)* | Node.js 18.18.0 (LTS) | Node.js 20.17.0 (LTS) | `node -v` |
| **PostgreSQL** *(External DB only)* | 15.0 | 15.7 or 16.3 | `psql --version` |
| **OpenSSL** | 1.1.1 | 3.0.2+ | `openssl version` |

### Recommended Hardware Sizing

| Sizing Profile | Concurrent Users | CPU Cores | RAM | Storage Allocation | Network Throughput |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Minimum / Evaluation** | Up to 100 | 4 vCPU | 8 GB | 100 GB SSD | 100 Mbps |
| **Standard Production** | Up to 1,000 | 8 vCPU | 16 GB | 500 GB NVMe | 1 Gbps |
| **High-Availability Enterprise** | 5,000+ | 16 vCPU | 32 GB | 2 TB NVMe RAID-10 | 10 Gbps |

---

## 4. Network & Firewall Requirements

### Ingress & Egress Port Allocation

| Port | Protocol | Traffic Direction | Source / Destination | Subsystem / Purpose |
| :--- | :---: | :---: | :--- | :--- |
| **80** | TCP | Inbound | Client Subnets → Nginx | HTTP (Mandatory 301 Redirect to HTTPS) |
| **443** | TCP | Inbound | Client Subnets → Nginx | HTTPS Production Web Portal & API Gateway |
| **3000** | TCP | Internal | Nginx → Next.js Container | Internal Frontend Node.js Standalone Port |
| **8081** | TCP | Internal | Nginx → Backend Cluster | Internal Spring Boot REST API Port |
| **8080** | TCP | Internal | Nginx / Backend → Keycloak | Internal Keycloak OIDC Authentication Port |
| **5432** | TCP | Internal | Backend & Keycloak → PostgreSQL | Internal PostgreSQL Database Port |
| **10000** | UDP | Inbound | Clients → Jitsi JVB *(Optional)* | WebRTC Audio/Video Media Stream Port |
| **8443** | TCP | Inbound | Clients → Jitsi Web *(Optional)* | Self-hosted Jitsi Web Meeting Ingress Port |

---

## 5. Pre-Deployment Checklist

Before beginning deployment, ensure the following prerequisites are completed:

- [ ] **DNS Record Configured:** The production FQDN (e.g., `kms.enterprise.internal` or `kms.organization.gov.et`) resolves to the host server IP.
- [ ] **TLS Certificates Issued:** Valid CA-signed certificate and private key files ready (`kms_enterprise.crt` and `kms_enterprise.key`).
- [ ] **Docker Engine & Compose V2 Installed:** Verified via `docker info` and `docker compose version`.
- [ ] **Dedicated Service Account Created:** Non-root system account (e.g., `kmsadmin`) with Docker group privileges.
- [ ] **Storage Volume Path Prepared:** Target disk location for document binaries has at least 100 GB available.
- [ ] **Database Passwords Generated:** Strong, cryptographically secure passwords generated for PostgreSQL and Keycloak admin.
- [ ] **Firewall Ports Allowed:** TCP 80, 443 open to client subnets.

---

## 6. Database Deployment & Initialization

The INSA KMS uses PostgreSQL 15+ as its primary relational database. All schema tables, indices, triggers, foreign keys, and default records are automatically created and maintained using **Flyway Database Migrations** upon backend startup.

### Step 1: Database Credentials Setup
In your production `.env` file, specify your database configuration:
```env
DATABASE_HOST=kms-postgres
DATABASE_PORT=5432
DATABASE_NAME=kmsdb
DATABASE_USERNAME=kmsuser
DATABASE_PASSWORD=<PRODUCTION_DATABASE_PASSWORD>
DATABASE_SSLMODE=?sslmode=disable
```

### Step 2: Running PostgreSQL in Docker
The production compose file `docker-compose.prod.yml` defines the PostgreSQL service:
```yaml
kms-postgres:
  image: postgres:15-alpine
  container_name: kms-postgres-prod
  restart: always
  environment:
    POSTGRES_DB: ${DATABASE_NAME:-kmsdb}
    POSTGRES_USER: ${DATABASE_USERNAME:-kmsuser}
    POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
  volumes:
    - kms-postgres-prod-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USERNAME:-kmsuser} -d ${DATABASE_NAME:-kmsdb}"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Step 3: Migration Execution & Validation
When the Spring Boot backend starts, Flyway automatically scans `classpath:db/migration` and applies all migrations in numerical sequence:
* `V1__init_schema.sql` (Core 35 tables, enums, indices)
* `V2__user_management_enhancements.sql`
* `V3__seed_default_data.sql` (Initial test roles and department taxonomy)
* `V6` through `V39` (Sequential workflows, discussions, voice notes, articles, blogs, clearance checklists, audit holds)

---

## 7. Keycloak Identity Provider Deployment & Realm Configuration

Keycloak provides enterprise OpenID Connect (OIDC) Single Sign-On (SSO), token issuance, and role management.

### Keycloak Specifications
* **Engine:** Keycloak 24.0.1 (Quarkus Optimized Build)
* **Realm Name:** `kms-realm`
* **Public Client ID:** `kms-frontend-client`
* **Admin Management Client:** `admin-cli`
* **Default Realm Configuration File:** `./keycloak/kms-realm.json`

### Step 1: Keycloak Environment Configuration
In `.env`:
```env
KEYCLOAK_URL=https://kms.enterprise.internal
KEYCLOAK_REALM=kms-realm
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<KEYCLOAK_ADMIN_PASSWORD>
OIDC_CLIENT_ID=kms-frontend-client
OIDC_CLIENT_SECRET=kms-frontend-secret-placeholder
```

### Step 2: Automatic Realm Import
The Keycloak container is configured in `docker-compose.prod.yml` with `--import-realm`. It automatically imports `./keycloak/kms-realm.json` on initial startup.

### Step 3: Production Client Settings Verification
If configuring Keycloak through the Admin Console (`https://<DOMAIN>/admin/`):
1. Navigate to **Clients** → `kms-frontend-client`.
2. Ensure **Client authentication** is set to `Off` (Public client).
3. Under **Access settings**, configure:
   * **Root URL:** `https://<PRODUCTION_DOMAIN>`
   * **Home URL:** `https://<PRODUCTION_DOMAIN>`
   * **Valid redirect URIs:**
     ```text
     https://<PRODUCTION_DOMAIN>/*
     https://<PRODUCTION_DOMAIN>/auth/callback
     ```
   * **Web origins:**
     ```text
     https://<PRODUCTION_DOMAIN>
     +
     ```
4. Click **Save**.

---

## 8. Backend API Deployment (Spring Boot 3)

The backend is built with Spring Boot 3.3.4, Java 21, Spring Data JPA, and Spring Security Resource Server.

### Build & Packaging (Maven)
```bash
cd backend
mvn clean package -DskipTests
```
The output artifact is generated at:
`backend/target/kms-backend-1.0.0-SNAPSHOT.jar`

### Containerized Deployment (`docker-compose.prod.yml`)
```yaml
kms-backend-1:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: kms-backend-prod-1
  restart: always
  environment:
    SPRING_DATASOURCE_URL: jdbc:postgresql://${DATABASE_HOST:-kms-postgres}:${DATABASE_PORT:-5432}/${DATABASE_NAME:-kmsdb}
    SPRING_DATASOURCE_USERNAME: ${DATABASE_USERNAME:-kmsuser}
    SPRING_DATASOURCE_PASSWORD: ${DATABASE_PASSWORD}
    SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI: ${KEYCLOAK_URL}/realms/kms-realm
    KMS_STORAGE_LOCATION: /app/kms-storage-data
    KMS_CORS_ALLOWED_ORIGINS: https://${DOMAIN:-kms.enterprise.internal}
  volumes:
    - kms-storage-data:/app/kms-storage-data
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:8081/api/v1/health/liveness || exit 1"]
    interval: 10s
    timeout: 3s
    retries: 3
```

---

## 9. Frontend Web Portal Deployment (Next.js 14)

The web portal is built using Next.js 14 App Router, React 18, and Tailwind CSS. It is compiled in `standalone` mode to run in lightweight Node.js container runners without requiring development dependencies.

---

## 10. Progressive Web App (PWA) Deployment

The INSA KMS is fully PWA-enabled, allowing employees to install the KMS directly on Windows, macOS, Linux, iOS, and Android devices as a standalone desktop/mobile application.

### PWA Component Overview
* **Web App Manifest (`frontend/public/manifest.json`)**
* **Service Worker (`frontend/public/sw.js`)**

---

## 11. Reverse Proxy & TLS Gateway Deployment (Nginx)

Nginx serves as the unified HTTPS edge gateway, terminating TLS, enforcing HTTP Strict Transport Security (HSTS), rate-limiting sensitive authentication endpoints, and routing traffic between the frontend, backend, and Keycloak.

See [`nginx/nginx-prod.conf`](file:///c:/Users/Administrator/Desktop/INSA_FINAL/INSA-KMS/nginx/nginx-prod.conf) for the full configuration.

---

## 12. Self-Hosted Video Conferencing Module (Jitsi Meet WebRTC)

For classified environments requiring air-gapped video conferencing, the KMS includes a dedicated self-hosted Jitsi Meet stack authenticated via Prosody JWT.

Deploy with:
```bash
docker compose -f docker-compose.jitsi.yml up -d
```

---

## 13. Production Environment Variables Reference

| Variable Name | Component | Required? | Example / Placeholder Format | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| `DOMAIN` | System / Nginx | **YES** | `kms.organization.gov.et` | Public FQDN of the KMS server |
| `DATABASE_HOST` | Backend / Keycloak | **YES** | `kms-postgres` or `<DB_HOSTNAME>` | PostgreSQL host name |
| `DATABASE_PORT` | Backend / Keycloak | **YES** | `5432` | PostgreSQL port |
| `DATABASE_NAME` | Backend / Keycloak | **YES** | `kmsdb` | Database schema name |
| `DATABASE_USERNAME` | Backend / Keycloak | **YES** | `kmsuser` | Database user account |
| `DATABASE_PASSWORD` | Backend / Keycloak | **YES** | `<PRODUCTION_DATABASE_PASSWORD>` | Database user password |
| `DATABASE_SSLMODE` | Backend / Keycloak | Optional | `?sslmode=disable` or `?sslmode=require` | SSL mode for JDBC connection |
| `SPRING_DATASOURCE_URL` | Backend | **YES** | `jdbc:postgresql://<DB_HOST>:5432/<DB_NAME>` | Spring Boot primary JDBC URL |
| `KEYCLOAK_URL` | Backend / Compose | **YES** | `https://kms.organization.gov.et` | Keycloak base URL (no realm suffix) |
| `KEYCLOAK_REALM` | Backend / Frontend | **YES** | `kms-realm` | Keycloak realm name |
| `KEYCLOAK_ADMIN_USER` | Backend / Keycloak | **YES** | `admin` | Keycloak master admin user |
| `KEYCLOAK_ADMIN_PASSWORD` | Backend / Keycloak | **YES** | `<KEYCLOAK_ADMIN_PASSWORD>` | Keycloak master admin password |
| `OIDC_CLIENT_ID` | Keycloak / Frontend | **YES** | `kms-frontend-client` | OIDC Client ID |
| `NEXT_PUBLIC_API_URL` | Frontend | **YES** | `https://kms.organization.gov.et/api/v1` | Public REST API base URL |
| `NEXT_PUBLIC_KEYCLOAK_URL` | Frontend | **YES** | `https://kms.organization.gov.et` | Public Keycloak base URL |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | Frontend | **YES** | `kms-realm` | Realm name for OIDC handshake |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | Frontend | **YES** | `kms-frontend-client` | Client ID for OIDC handshake |
| `KMS_STORAGE_LOCATION` | Backend | **YES** | `/app/kms-storage-data` | Document binary storage root |
| `KMS_CORS_ALLOWED_ORIGINS` | Backend | **YES** | `https://kms.organization.gov.et` | Allowed CORS origins for backend API |
| `KMS_ENCRYPTION_ENABLED` | Backend | Optional | `true` or `false` | Enable AES-256-GCM storage encryption |
| `KMS_ENCRYPTION_KEY` | Backend | If Enc. ON | `<BASE64_32BYTE_AES_KEY>` | Durable AES encryption key |
| `JVB_ADVERTISED_IP` | Jitsi JVB | If Jitsi ON | `192.168.1.100` or `<ROUTABLE_IP>` | Server IP advertised for WebRTC UDP |
| `KMS_JITSI_JWT_SECRET` | Backend / Jitsi | If Jitsi ON | `<SECURE_JWT_SECRET>` | Shared secret for video room tokens |

---

## 14. Initial System Setup & Administrative Onboarding

### Step 1: Clone Repository & Create Production Environment
```bash
git clone https://<REPO_URL>/INSA-KMS.git
cd INSA-KMS
cp .env.production.example .env
```

### Step 2: Install TLS / SSL Certificates
Place your certificate and key files inside `./certs/`:
```bash
cp /path/to/enterprise.crt ./certs/kms_enterprise.crt
cp /path/to/enterprise.key ./certs/kms_enterprise.key
chmod 600 ./certs/kms_enterprise.key
```

### Step 3: Launch Production Cluster
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Initial Administrative Login
1. Open `https://<PRODUCTION_DOMAIN>` in your browser.
2. Click **Login with Enterprise Single Sign-On**.
3. Log in with the pre-seeded Super Administrator credentials:
   * **Username:** `admin`
   * **Password:** `admin123` *(Must be changed immediately after first login)*
4. Access the **Admin Console** (`https://<PRODUCTION_DOMAIN>/admin`):
   * Navigate to **Admin** → **Users** to manage user accounts and assign roles.
   * Navigate to **Admin** → **Departments** to configure organizational units and storage quotas.
   * Navigate to **Admin** → **Approvals** to configure multi-step approval workflow templates.

---

## 15. Verification & End-to-End Smoke Testing

### 1. Ingress & TLS Verification
```bash
curl -I https://<PRODUCTION_DOMAIN>
```

### 2. Backend Health & Liveness
```bash
curl -k https://<PRODUCTION_DOMAIN>/api/v1/health
```

### 3. Keycloak OIDC Discovery
```bash
curl -k https://<PRODUCTION_DOMAIN>/realms/kms-realm/.well-known/openid-configuration
```

---

## 16. Backup, Restore & Disaster Recovery

### Automated Database Backup Script (`scripts/backup-database.ps1`)
```powershell
.\scripts\backup-database.ps1 -BackupDir "./backups" -ContainerName "kms-postgres-prod"
```

### Database Restoration Procedure
```bash
gunzip -c /var/backups/kms/kmsdb_YYYYMMDD_HHMMSS.sql.gz | docker exec -i kms-postgres-prod psql -U kmsuser -d kmsdb
```

### Physical Document Storage Backup
```bash
tar -czvf /var/backups/kms/kms_storage_$(date +\%Y\%m\%d).tar.gz -C /var/lib/docker/volumes/insa-kms_kms-storage-data/_data .
```

---

## 17. Monitoring, Health Checks & Production Logging

### Viewing Real-Time Service Logs
```bash
docker logs -f kms-nginx-tls-prod
docker logs -f kms-backend-prod-1
docker logs -f kms-backend-prod-2
docker logs -f kms-keycloak-prod
docker logs -f kms-postgres-prod
```

---

## 18. Routine Maintenance & Operational Procedures

### Restarting the Cluster
```bash
docker compose -f docker-compose.prod.yml restart
```

### Applying Application Updates
```bash
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Renewing SSL / TLS Certificates
```bash
docker exec kms-nginx-tls-prod nginx -s reload
```

---

## 19. Comprehensive Troubleshooting Guide

| Symptom / Error | Probable Root Cause | Diagnostic Method | Resolution Step |
| :--- | :--- | :--- | :--- |
| **`Invalid parameter: redirect_uri`** | Keycloak redirect URI mismatch | Check browser URL when redirected to Keycloak | In Keycloak Admin (`/admin`), edit `kms-frontend-client` and add `https://<DOMAIN>/*` to Valid Redirect URIs. |
| **Keycloak login page renders unstyled (CSS/JS 404)** | Nginx missing `/resources/` or `/js/` proxy rules | Inspect browser Network tab for failing 404 assets | Ensure `nginx-prod.conf` contains proxy rules for `location /resources/` and `location /js/`. |
| **Backend `FileNotFoundException` on document download** | Missing shared volume mount between backend nodes | Check backend logs (`docker logs kms-backend-prod-2`) | Ensure `kms-storage-data:/app/kms-storage-data` is mounted to both backend containers in `docker-compose.prod.yml`. |
| **`CORS policy: No 'Access-Control-Allow-Origin' header`** | Frontend domain not in allowed CORS origins | Check browser console errors | Set `KMS_CORS_ALLOWED_ORIGINS=https://<DOMAIN>` in `.env` and restart backend. |
| **`502 Bad Gateway` on `/api/`** | Backend containers initializing or crashed | Run `docker ps` and check backend logs | Verify PostgreSQL is healthy and Flyway migrations completed successfully. |
| **Jitsi video calls fail to connect WebRTC stream** | `JVB_ADVERTISED_IP` set to `127.0.0.1` | Check browser WebRTC internal logs | In `.env`, set `JVB_ADVERTISED_IP=<SERVER_PUBLIC_OR_LAN_IP>` and restart Jitsi compose. |
| **Uploads above 10MB fail with HTTP 413** | Nginx or Spring Boot payload limit exceeded | Check Nginx error log (`client_max_body_size`) | Verify `client_max_body_size 500M;` in `nginx-prod.conf` and `spring.servlet.multipart.max-file-size=500MB` in `application.yml`. |

---

## 20. Production Security Hardening Checklist

- [x] **Enforce HTTPS Only:** HTTP port 80 strictly issues 301 redirects to port 443.
- [x] **Disable Plaintext Database Fallbacks:** All default credentials in `application.yml` replaced with environment variables.
- [x] **Enable Rate Limiting:** Nginx limits authentication attempts to 10 requests/minute per IP to prevent brute-force attacks.
- [x] **HSTS Preload Header:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` enabled.
- [x] **Change Default Passwords:** Immediately update `admin`, `admin_ops`, and `postgres` passwords upon initial login.
- [x] **Session Storage Security:** Client tokens stored in browser `sessionStorage` (cleared automatically on tab/window close).
- [x] **PWA Cache Whitelist:** Sensitive API responses and auth tokens explicitly excluded from Service Worker caches.

---

## 21. Rollback & Emergency Recovery Procedures

### Step 1: Rollback Container Images
```bash
git checkout <PREVIOUS_STABLE_TAG>
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 2: Rollback Database (If schema changes occurred)
```bash
docker stop kms-backend-prod-1 kms-backend-prod-2
gunzip -c /var/backups/kms/kmsdb_pre_upgrade.sql.gz | docker exec -i kms-postgres-prod psql -U kmsuser -d kmsdb
docker start kms-backend-prod-1 kms-backend-prod-2
```

---

## 22. Production Go-Live Sign-Off Checklist

```text
================================================================================
                    INSA KMS PRODUCTION GO-LIVE SIGN-OFF
================================================================================

[ ] INFRASTRUCTURE READINESS
    - Production Host OS Hardened and Patched
    - DNS A-Record Active and Propagated
    - Firewall Configured (Ports 80, 443 Open; Database Ports Restricted)
    - Valid TLS Certificates Installed in ./certs/

[ ] IDENTITY & ACCESS MANAGEMENT
    - Keycloak OIDC Realm (kms-realm) and Client (kms-frontend-client) Active
    - Root Admin Default Password Changed
    - Enterprise Role Hierarchy Verified (SUPER_ADMIN, ADMIN, OWNER, CONTRIBUTOR, VIEWER)

[ ] DATABASE & STORAGE SUBSYSTEM
    - PostgreSQL 15 Healthy on Dedicated Volume
    - All 33 Flyway Migrations Applied Successfully
    - Shared Storage Volume (kms-storage-data) Mounted & Verified
    - Daily Automated Database & File Backup Scheduled

[ ] WEB PORTAL & APPLICATION CLUSTER
    - Dual Backend Nodes Active Behind Nginx Upstream Cluster
    - Next.js Standalone Frontend Responding via HTTPS
    - End-to-End Authentication, Upload, Search, and Approvals Verified
    - PWA Installable on Client Desktops & Mobiles

================================================================================
System Approved for Production Go-Live: ____________________ Date: ______________
Lead Systems Administrator / IT Authority: _____________________________________
================================================================================
```
