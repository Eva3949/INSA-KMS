# KMS Production Scalability & Availability Architecture (NFR-02 & NFR-03)

## 1. NFR-02 Scalability Architecture & Verification

The KMS application is engineered to scale horizontally to 3x+ current document volume and concurrent users without core architectural redesign:

* **Stateless REST Services**:
  * Spring Boot backend endpoints rely strictly on Keycloak RS256 JWT access tokens passed via HTTP `Authorization: Bearer <token>` headers. No in-memory server session state exists.
  * Backend containers can be scaled behind an AWS ALB or Nginx load balancer (`kms-backend-1`, `kms-backend-2`, `kms-backend-3`).

* **Database Connection Pool Tuning (`HikariCP`)**:
  * Configured in `application.yml`:
    * `maximum-pool-size: 20`
    * `minimum-idle: 5`
    * `idle-timeout: 30000`
    * `leak-detection-threshold: 2000`

* **Full-Text Search Indexing**:
  * PostgreSQL GIN index `idx_doc_version_fts` on `document_versions(extracted_text, file_name)` enables sub-second full-text retrieval across millions of records.

* **Storage Layer Decoupling**:
  * `storage_objects` table abstracts local disk / S3 object storage paths, preventing file system bottlenecks.

---

## 2. NFR-03 Production High Availability (99.5% Uptime SLA)

To achieve 99.5% business-hours uptime (RTO < 30 minutes, RPO < 15 minutes), the production environment employs the following deployment topology:

```text
                        ┌───────────────────────────────┐
                        │   Global DNS / Cloudflare     │
                        └───────────────┬───────────────┘
                                        │ HTTPS / TLS
                                        ▼
                        ┌───────────────────────────────┐
                        │   Load Balancer / Reverse     │
                        │   Proxy (Nginx / ALB)         │
                        └───────┬───────────────┬───────┘
                                │               │
                ┌───────────────┴───┐       ┌───┴───────────────┐
                ▼                   ▼       ▼                   ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │ KMS Backend 1 │   │ KMS Backend 2 │   │ Next.js Node 1│   │ Next.js Node 2│
        └───────┬───────┘   └───────┬───────┘   └───────────────┘   └───────────────┘
                │                   │
                ▼                   ▼
        ┌───────────────────────────────────┐
        │ Keycloak Cluster (Active-Active)  │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │ PostgreSQL Primary / Replica Cluster│
        └───────────────────────────────────┘
```

---

## 3. Health Monitoring & Probes

* **Spring Boot Actuator Health Probe**:
  * `GET /api/v1/health` returns `{"status": "UP", "service": "kms-backend"}`
  * Health check interval: 10s, Timeout: 3s, Retries: 3.

* **Keycloak Health Probe**:
  * `GET /realms/kms-realm` or `/health/ready` returns HTTP 200.

* **PostgreSQL Health Probe**:
  * `pg_isready -U kmsuser -d kmsdb` test command executed inside container.

---

## 4. Disaster Recovery (RTO / RPO Targets)

* **RTO (Recovery Time Objective)**: 30 minutes. Automatic failover via Docker Swarm / Kubernetes deployment.
* **RPO (Recovery Point Objective)**: 15 minutes. PostgreSQL Point-In-Time Recovery (PITR) WAL archiving to cloud storage.
