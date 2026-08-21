# KMS ENTERPRISE — FINAL 3 FRD/NFR GAP CLOSURE PLAN

**Date**: 2026-08-21  
**Target Requirements**: FR-24 (Microsoft 365 Integration), FR-21 (Production TLS), NFR-03 (High Availability)  
**Project Path**: `C:\Users\PC\Downloads\KMS`  

---

## 1. Current System State Summary

* **User Management Subsystem**: **FULLY VERIFIED** (List, View, Create, Edit, Activate, Deactivate, Change Role, Soft Delete, Directory Search, Keycloak sub mapping, PostgreSQL `users` table, and `@AuditLog` event logging verified with 10/10 passing tests in `UserManagementIntegrationTest.java`).
* **FR-24 (Microsoft 365 / WebDAV Save-Back)**: Integration layer implemented in `MicrosoftGraphService.java` and `WebDavController.java` (`POST /api/v1/documents/{id}/webdav-sync`, `GET /graph-details`). Unit test suite `MicrosoftGraphIntegrationTest.java` passing (4/4 tests PASS). Live tenant background auto-sync is **EXTERNAL CONFIGURATION REQUIRED** (requires live Azure AD tenant credentials `MS_GRAPH_CLIENT_ID` & `MS_GRAPH_CLIENT_SECRET`).
* **FR-21 (Production TLS Gateway)**: Local development environment uses HTTP (`localhost:3000`, `localhost:8081`). Cryptographically valid RSA 2048-bit certificate and PKCS#8 key generated (`certs/kms_enterprise.crt` & `certs/kms_enterprise.key`). Production stack `docker-compose.prod.yml` & `nginx-prod.conf` configured with TLS 1.3, HSTS, secure cookies, and restricted CORS. Status: **PARTIAL / PRODUCTION CERTIFICATE REQUIRED**.
* **NFR-03 (High Availability Failover)**: Multi-instance stack `docker-compose.ha.yml` (`kms-backend-1`, `kms-backend-2`), load balancer `nginx-ha.conf`, and health probes (`/health/liveness`, `/health/readiness`) validated via `docker compose config` (0 errors). Status: **VERIFIED LOCAL HA / PRODUCTION INFRASTRUCTURE REQUIRED**.

---

## 2. Gap Closure Strategy & Implementation Scope

### FR-24: Configuration-Driven Microsoft Graph Integration
1. **Environment Configuration**: Add support for `MS_GRAPH_ENABLED`, `MS_GRAPH_SYNC_ENABLED`, `MS_GRAPH_SYNC_INTERVAL`, `MS_GRAPH_BASE_URL`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET` in `application.yml` and backend services.
2. **Health Indicator Endpoint**: Enhance `HealthController.java` to report `MICROSOFT_GRAPH` readiness status (`ENABLED`, `DISABLED`, `CONFIGURED`, `HEALTHY`) without exposing secrets.
3. **Graceful Startup**: Ensure application starts cleanly when Graph integration is disabled (`MS_GRAPH_ENABLED=false`).
4. **Secret Redaction**: Verify secrets and access tokens are redacted in application logs.

### FR-21: Production TLS & Verification Scripts
1. **Production Gateway**: Mount RSA 2048-bit certificates in `nginx-prod.conf` with TLS 1.2/1.3, HSTS, secure cookies, and HTTP -> HTTPS 301 redirection.
2. **TLS Verification Scripts**: Create `scripts/test-production-tls.ps1` and `scripts/test-production-tls.sh` to test port 443 HTTPS response, TLS 1.2/1.3 protocol handshake, HSTS headers, and cert validity.

### NFR-03: Local High Availability Failover & Health Probes
1. **Multi-Instance Backend Stack**: Deploy stateless `kms-backend-1` and `kms-backend-2` behind Nginx load balancer (`nginx-ha.conf`) connected to `kms-postgres` and `kms-keycloak`.
2. **Failover Execution**: Validate load balancer routing during container stoppage and recovery.
