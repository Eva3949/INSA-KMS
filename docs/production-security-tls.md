# KMS Enterprise Production TLS & Encryption Architecture (FR-21)

## 1. Local Development vs. Production Deployment

* **Local Development Environment**:
  * Protocols: HTTP (`http://localhost:3000`, `http://localhost:8080`, `http://localhost:8081`)
  * Storage: Local browser `sessionStorage` (`kms_access_token`) and Lax cookie (`kms_auth_present=true`).
  * JWT Security: RS256 RSA signature validation active on all Bearer tokens.

* **Production Deployment Architecture**:
  * Protocol: HTTPS / TLS 1.3 mandatory across all endpoints (`https://kms.enterprise.internal`).
  * TLS Termination: Dedicated Reverse Proxy (Nginx / Traefik / AWS ALB / F5 BIG-IP).
  * HSTS (HTTP Strict Transport Security): `max-age=31536000; includeSubDomains; preload` enabled.

---

## 2. Nginx Production TLS Reverse Proxy Configuration Example

```nginx
# Nginx KMS Production TLS Termination Config
server {
    listen 80;
    server_name kms.enterprise.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kms.enterprise.internal;

    ssl_certificate /etc/ssl/certs/kms_enterprise.crt;
    ssl_certificate_key /etc/ssl/private/kms_enterprise.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS & Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Next.js Frontend Proxy
    location / {
        proxy_pass http://kms-frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Spring Boot REST API Proxy
    location /api/ {
        proxy_pass http://kms-backend:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Keycloak OIDC Authentication Proxy
    location /realms/ {
        proxy_pass http://kms-keycloak:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 3. Keycloak Production HTTPS Settings

* Environment Variables:
  * `KC_HOSTNAME=https://kms.enterprise.internal/auth`
  * `KC_PROXY=edge` (or `reencrypt`)
  * `KC_HTTP_ENABLED=false`
* OIDC Redirect URIs:
  * `https://kms.enterprise.internal/*`
  * `https://kms.enterprise.internal/auth/callback`

---

## 4. Production Cookie & Token Security

* `kms_auth_present` Cookie Flags in Production:
  * `Secure`: `true` (transmitted over HTTPS only)
  * `HttpOnly`: `true`
  * `SameSite`: `Strict`
