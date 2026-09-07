# INSA Knowledge Management System (KMS)
# Complete Production Deployment & Installation Guide

**Document Reference:** `docs/DEPLOYMENT_DOCUMENTATION.md`  
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
20. [Production Security Hardening Checklist](#20-production-security-hardening-checklist)
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

*Note: Storage space should be sized according to anticipated document upload volumes. Document storage (`kms-storage-data`) supports hot-expansion on dedicated SAN/NAS or NVMe volumes.*

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

### Enterprise Firewall Commands

#### Ubuntu / Debian (UFW)
```bash
sudo ufw allow 80/tcp comment "KMS HTTP Redirect"
sudo ufw allow 443/tcp comment "KMS HTTPS Gateway"
# Optional (Only if self-hosted Jitsi video is enabled):
sudo ufw allow 10000/udp comment "KMS Jitsi WebRTC"
sudo ufw allow 8443/tcp comment "KMS Jitsi Web UI"
sudo ufw enable
```

#### RHEL / AlmaLinux / Rocky Linux (Firewalld)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
# Optional for Jitsi:
sudo firewall-cmd --permanent --add-port=10000/udp
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload
```

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

To manually inspect the migration status via PostgreSQL CLI:
```bash
docker exec -it kms-postgres-prod psql -U kmsuser -d kmsdb -c "SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;"
```

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

### Step 4: Role Mapping Configuration
Ensure the following realm roles are defined in Keycloak:
* `ROLE_SUPER_ADMIN` (Full System Administrator with root governance rights)
* `ROLE_ADMIN` (Standard Operations Administrator)
* `ROLE_CONTENT_OWNER` (Departmental Knowledge Approver & Publisher)
* `ROLE_CONTRIBUTOR` (Standard Employee with document upload & editing rights)
* `ROLE_VIEWER` (Read-only document access)
* `ROLE_COMPLIANCE_OFFICER` (Legal hold and retention manager)
* `ROLE_IT_SECURITY` (Audit log inspection & SIEM integration manager)

---

## 8. Backend API Deployment (Spring Boot 3)

The backend is built with Spring Boot 3.3.4, Java 21, Spring Data JPA, and Spring Security Resource Server.

### Backend Startup Architecture

```text
Backend Startup
     │
     ├─► 1. Establish HikariCP Connection to PostgreSQL
     ├─► 2. Run Flyway Database Migrations (V1 to V39)
     ├─► 3. Initialize Keycloak OIDC JWT Public Key Discovery
     ├─► 4. Mount Shared Document Storage Root (/app/kms-storage-data)
     ├─► 5. Execute DataInitializer (Seed Default Super Admin & Templates)
     └─► 6. Bind Embedded Tomcat to Port 8081 & Expose REST API
```

### Build & Packaging (Maven)
To package the standalone executable JAR:
```bash
cd backend
mvn clean package -DskipTests
```
The output artifact is generated at:
`backend/target/kms-backend-1.0.0-SNAPSHOT.jar`

### Containerized Deployment (`docker-compose.prod.yml`)
The backend is deployed as a dual-instance cluster (`kms-backend-1` and `kms-backend-2`) behind the Nginx load balancer.

Key parameters in `docker-compose.prod.yml`:
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

### Build-Time Environment Inlining
Next.js inlines `NEXT_PUBLIC_*` variables during the compilation step. The production Docker build supplies these via `ARG`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL}
ENV NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM}
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 10. Progressive Web App (PWA) Deployment

The INSA KMS is fully PWA-enabled, allowing employees to install the KMS directly on Windows, macOS, Linux, iOS, and Android devices as a standalone desktop/mobile application.

### PWA Component Overview
* **Web App Manifest (`frontend/public/manifest.json`):**
  * `id`: `/?source=pwa`
  * `display`: `standalone`
  * `theme_color`: `#1e40af` (INSA Enterprise Blue)
  * `icons`: 192x192 PNG, 512x512 PNG, SVG, maskable icons
  * `shortcuts`: Quick navigation to Document Library, Advanced Search, Upload, and Knowledge Transfer
* **Service Worker (`frontend/public/sw.js`):**
  * Pre-caches static UI assets and `/offline.html` fallback.
  * **Enterprise Security Rule:** Strictly bypasses caching for all `/api/*`, `/auth/*`, and Keycloak endpoints to ensure zero confidential document caching on unencrypted client disks.

### Installing the PWA as an End-User
1. Open the KMS URL in Google Chrome, Microsoft Edge, or Safari: `https://<PRODUCTION_DOMAIN>`
2. In the address bar, click the **Install KMS App** icon (or click the "Install Desktop App" button in the sidebar).
3. The KMS launches in its own dedicated, native OS application window with system tray integration.

---

## 11. Reverse Proxy & TLS Gateway Deployment (Nginx)

Nginx serves as the unified HTTPS edge gateway, terminating TLS, enforcing HTTP Strict Transport Security (HSTS), rate-limiting sensitive authentication endpoints, and routing traffic between the frontend, backend, and Keycloak.

### Production Nginx Configuration (`nginx/nginx-prod.conf`)

```nginx
events {
    worker_connections 2048;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # TLS v1.2 / v1.3 Enterprise Ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 500M;

    # Rate Limiting Zones (DDoS & Brute-Force Mitigation)
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    upstream kms_backend_cluster {
        server kms-backend-1:8081 max_fails=3 fail_timeout=10s;
        server kms-backend-2:8081 max_fails=3 fail_timeout=10s;
    }

    upstream kms_frontend_cluster {
        server kms-frontend:3000;
    }

    # HTTP -> HTTPS 301 Mandatory Redirect
    server {
        listen 80;
        server_name kms.enterprise.internal;
        return 301 https://$host$request_uri;
    }

    # HTTPS Production Gateway
    server {
        listen 443 ssl http2;
        server_name kms.enterprise.internal;

        ssl_certificate /etc/nginx/certs/kms_enterprise.crt;
        ssl_certificate_key /etc/nginx/certs/kms_enterprise.key;

        # HSTS & Enterprise Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Frontend Web Portal Proxy
        location / {
            proxy_pass http://kms_frontend_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        # Auth Brute-Force Rate Limiting
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=5 nodelay;
            proxy_pass http://kms_backend_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        # Spring Boot REST API Proxy
        location /api/ {
            limit_req zone=api_limit burst=50 nodelay;
            proxy_pass http://kms_backend_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            client_max_body_size 500M;
            proxy_read_timeout 300s;
            proxy_connect_timeout 60s;
        }

        # Keycloak OIDC Authentication Proxy & Static Resources
        location /realms/ {
            proxy_pass http://kms-keycloak:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        location /resources/ {
            proxy_pass http://kms-keycloak:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        location /js/ {
            proxy_pass http://kms-keycloak:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        location /admin/ {
            proxy_pass http://kms-keycloak:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
```

---

## 12. Self-Hosted Video Conferencing Module (Jitsi Meet WebRTC)

For classified environments requiring air-gapped video conferencing (e.g. for employee knowledge transfer sessions), the KMS includes a dedicated self-hosted Jitsi Meet stack authenticated via Prosody JWT.

### Deployment Compose File: `docker-compose.jitsi.yml`
* **Web UI Port:** `8443` (HTTPS) / `8088` (HTTP)
* **WebRTC Media Port:** `10000/udp` (Must be routed to server's public/LAN IP)
* **JWT App ID:** `insa-kms-video`
* **Zero Third-Party Calls:** `DISABLE_THIRD_PARTY_REQUESTS=true` enabled across all containers.

To start the Jitsi conferencing cluster:
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
Edit `.env` and supply your actual enterprise domain and secure passwords.

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

Execute the following test battery to certify the deployment:

### 1. Ingress & TLS Verification
```bash
curl -I https://<PRODUCTION_DOMAIN>
# Expected output: HTTP/2 200 with Strict-Transport-Security header
```

### 2. Backend Health & Liveness
```bash
curl -k https://<PRODUCTION_DOMAIN>/api/v1/health
# Expected JSON output: {"status":"UP","service":"kms-backend"}
```

### 3. Keycloak OIDC Discovery
```bash
curl -k https://<PRODUCTION_DOMAIN>/realms/kms-realm/.well-known/openid-configuration
# Expected JSON output containing Keycloak authorization, token, and jwks_uri endpoints
```

### 4. Functional Capability Verification Suite
- [x] **User Authentication:** Log in as `admin`, verify token issuance and profile retrieval.
- [x] **Document Upload:** Upload a test PDF in `/upload`, verify SHA-256 hash and version creation.
- [x] **Document Search:** Search for uploaded document keyword in `/search`.
- [x] **Sequential Approvals:** Submit a draft document, log in as approver, and approve/reject.
- [x] **Discussions & Voice Notes:** Create a discussion thread, record a voice note, and verify playback.
- [x] **Knowledge Transfer:** Open `/knowledge-transfer`, create a handover case, and verify clearance tasks.
- [x] **Audit Trail:** Open `/governance/audit-logs`, verify recent actions are logged with client IP.

---

## 16. Backup, Restore & Disaster Recovery

### Automated Database Backup Script (`scripts/backup-database.ps1`)
The KMS includes an automated database backup utility:
```powershell
# PowerShell backup execution:
.\scripts\backup-database.ps1 -BackupDir "./backups" -ContainerName "kms-postgres-prod"
```

#### Linux Crontab Daily Backup (Recommended)
Add the following job to `crontab -e` on the host server:
```bash
0 2 * * * docker exec kms-postgres-prod pg_dump -U kmsuser kmsdb | gzip > /var/backups/kms/kmsdb_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

### Database Restoration Procedure
To restore a database backup:
```bash
gunzip -c /var/backups/kms/kmsdb_YYYYMMDD_HHMMSS.sql.gz | docker exec -i kms-postgres-prod psql -U kmsuser -d kmsdb
```

### Physical Document Storage Backup
Backup the named Docker volume `kms-storage-data`:
```bash
tar -czvf /var/backups/kms/kms_storage_$(date +\%Y\%m\%d).tar.gz -C /var/lib/docker/volumes/insa-kms_kms-storage-data/_data .
```

---

## 17. Monitoring, Health Checks & Production Logging

### Viewing Real-Time Service Logs

#### Nginx Reverse Proxy Logs
```bash
docker logs -f kms-nginx-tls-prod
```

#### Backend REST API Logs
```bash
docker logs -f kms-backend-prod-1
docker logs -f kms-backend-prod-2
```

#### Keycloak Identity Logs
```bash
docker logs -f kms-keycloak-prod
```

#### PostgreSQL Database Logs
```bash
docker logs -f kms-postgres-prod
```

### Container Health Monitoring
Check overall cluster health:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
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
When certificates are renewed by your enterprise CA:
1. Replace `./certs/kms_enterprise.crt` and `./certs/kms_enterprise.key`.
2. Reload Nginx without downtime:
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

If a newly deployed update introduces an operational defect:

### Step 1: Rollback Container Images
```bash
# Checkout previous stable git tag/commit
git checkout <PREVIOUS_STABLE_TAG>

# Rebuild and restart containers
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 2: Rollback Database (If schema changes occurred)
```bash
# Stop backend containers
docker stop kms-backend-prod-1 kms-backend-prod-2

# Restore pre-upgrade database backup
gunzip -c /var/backups/kms/kmsdb_pre_upgrade.sql.gz | docker exec -i kms-postgres-prod psql -U kmsuser -d kmsdb

# Restart backend containers
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
