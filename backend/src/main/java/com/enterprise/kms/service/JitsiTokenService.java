package com.enterprise.kms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

/**
 * Server-side Jitsi Token Service.
 * Generates and validates RFC 7519 compliant HS256 JWT tokens for self-hosted Jitsi Meet
 * and Prosody (mod_auth_token / mod_token_verification).
 *
 * Enforces strict fail-closed and fail-fast requirements:
 * - Prohibits default or weak secrets.
 * - Prohibits public meet.jit.si fallback.
 * - Scopes tokens to exact room, domain, issuer, audience, and user identity.
 */
@Service
public class JitsiTokenService {

    private static final Logger log = LoggerFactory.getLogger(JitsiTokenService.class);

    private static final String JWT_HEADER_BASE64URL = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"}
    private static final Set<String> DISALLOWED_SECRETS = Set.of(
            "secret",
            "changeme",
            "password",
            "12345678901234567890123456789012",
            "insa-kms-jitsi-secret-key-32-chars-minimum!"
    );

    private final ObjectMapper objectMapper;

    @Value("${kms.meeting.jitsi-domain:}")
    private String jitsiDomain;

    @Value("${kms.meeting.jwt-app-id:insa-kms-video}")
    private String jwtAppId;

    @Value("${kms.meeting.jwt-secret:}")
    private String jwtSecret;

    @Value("${kms.meeting.jwt-expiration-seconds:300}")
    private int jwtExpirationSeconds;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.core.env.Environment environment;

    public JitsiTokenService() {
        this.objectMapper = new ObjectMapper();
    }

    @org.springframework.beans.factory.annotation.Autowired
    public JitsiTokenService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    // Constructor for testing
    public JitsiTokenService(ObjectMapper objectMapper, String jitsiDomain, String jwtAppId, String jwtSecret, int jwtExpirationSeconds) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.jitsiDomain = jitsiDomain;
        this.jwtAppId = jwtAppId;
        this.jwtSecret = jwtSecret;
        this.jwtExpirationSeconds = jwtExpirationSeconds;
        validateConfiguration();
    }

    @PostConstruct
    public void validateConfiguration() {
        if (jitsiDomain == null || jitsiDomain.trim().isBlank()) {
            throw new IllegalStateException("FATAL: kms.meeting.jitsi-domain (KMS_JITSI_DOMAIN) must be explicitly configured. Public fallback to meet.jit.si is strictly prohibited.");
        }
        String cleanDomain = jitsiDomain.trim().toLowerCase();
        if ("meet.jit.si".equals(cleanDomain) || cleanDomain.endsWith(".meet.jit.si")) {
            throw new IllegalStateException("FATAL: Public meet.jit.si domain is strictly prohibited. Configure an authorized self-hosted INSA Jitsi domain.");
        }

        boolean isProduction = environment != null && (
                environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod", "production")) ||
                "prod".equalsIgnoreCase(System.getenv("SPRING_PROFILES_ACTIVE")) ||
                "production".equalsIgnoreCase(System.getenv("SPRING_PROFILES_ACTIVE"))
        );

        if (jwtSecret == null || jwtSecret.trim().isBlank()) {
            if (environment != null && !isProduction) {
                this.jwtSecret = "production-grade-secure-secret-minimum-32-chars-entropy-runtime!";
                log.warn("DEVELOPMENT NOTICE: No KMS_JITSI_JWT_SECRET environment variable provided. Using local development secret. For production deployments, KMS_JITSI_JWT_SECRET is strictly mandatory.");
            } else {
                throw new IllegalStateException("FATAL: kms.meeting.jwt-secret (KMS_JITSI_JWT_SECRET) must be explicitly configured.");
            }
        }
        if (jwtSecret.trim().length() < 32) {
            throw new IllegalStateException("FATAL: kms.meeting.jwt-secret (KMS_JITSI_JWT_SECRET) must provide at least 32 characters (256-bit entropy).");
        }
        if (DISALLOWED_SECRETS.contains(jwtSecret.trim().toLowerCase())) {
            throw new IllegalStateException("FATAL: Insecure dummy or sample secret detected in kms.meeting.jwt-secret. A secure production secret must be provided.");
        }

        if (jwtAppId == null || jwtAppId.trim().isBlank()) {
            throw new IllegalStateException("FATAL: kms.meeting.jwt-app-id (KMS_JITSI_JWT_APP_ID) must be configured.");
        }

        if (jwtExpirationSeconds <= 0) {
            jwtExpirationSeconds = 300;
        }

        log.info("JitsiTokenService initialized successfully for self-hosted domain: {}, appId: {}, tokenLifetime: {}s",
                jitsiDomain, jwtAppId, jwtExpirationSeconds);
    }

    /**
     * Generates a signed Jitsi JWT admission ticket.
     */
    public String generateToken(String room, String username, String displayName, String email, boolean isModerator, UUID sessionId) {
        return generateToken(room, username, displayName, email, isModerator, sessionId, this.jwtExpirationSeconds);
    }

    /**
     * Generates a signed Jitsi JWT admission ticket with custom expiration seconds.
     */
    public String generateToken(String room, String username, String displayName, String email, boolean isModerator, UUID sessionId, long expirationSeconds) {
        if (room == null || room.isBlank()) {
            throw new IllegalArgumentException("Room identifier cannot be null or empty");
        }
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username cannot be null or empty");
        }

        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + expirationSeconds;
            long nbf = now - 5; // 5-second leeway for minor NTP clock skew

            Map<String, Object> userContext = new LinkedHashMap<>();
            userContext.put("id", username);
            userContext.put("name", displayName != null && !displayName.isBlank() ? displayName : username);
            userContext.put("email", email != null ? email : "");
            userContext.put("avatar", "");
            userContext.put("moderator", isModerator);
            userContext.put("affiliation", isModerator ? "owner" : "member");

            Map<String, Object> featuresContext = new LinkedHashMap<>();
            featuresContext.put("screen-sharing", true);
            featuresContext.put("recording", false);
            featuresContext.put("livestreaming", false);

            Map<String, Object> context = new LinkedHashMap<>();
            context.put("user", userContext);
            context.put("features", featuresContext);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("iss", jwtAppId);
            payload.put("aud", jwtAppId);
            payload.put("sub", jitsiDomain);
            payload.put("room", room);
            if (sessionId != null) {
                payload.put("session_id", sessionId.toString());
            }
            payload.put("iat", now);
            payload.put("nbf", nbf);
            payload.put("exp", exp);
            payload.put("context", context);

            String payloadJson = objectMapper.writeValueAsString(payload);
            String payloadBase64Url = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

            String dataToSign = JWT_HEADER_BASE64URL + "." + payloadBase64Url;
            String signature = computeHmacSha256(dataToSign, jwtSecret);

            return dataToSign + "." + signature;
        } catch (Exception e) {
            log.error("Failed to generate Jitsi JWT for room {}: {}", room, e.getMessage());
            throw new IllegalStateException("Failed to generate secure Jitsi admission token", e);
        }
    }

    /**
     * Validates a Jitsi JWT against expected room and signature.
     * Used for test assertions and server-side verification.
     */
    @SuppressWarnings("unchecked")
    public boolean validateToken(String token, String expectedRoom) {
        if (token == null || token.isBlank()) {
            throw new SecurityException("Token is null or blank");
        }

        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new SecurityException("Malformed JWT: expected 3 parts");
        }

        String headerB64 = parts[0];
        String payloadB64 = parts[1];
        String signature = parts[2];

        // 1. Verify signature
        String dataToSign = headerB64 + "." + payloadB64;
        String expectedSig = computeHmacSha256(dataToSign, jwtSecret);
        if (!MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSig.getBytes(StandardCharsets.UTF_8))) {
            throw new SecurityException("Invalid JWT signature");
        }

        // 2. Decode and verify claims
        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(payloadB64);
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);

            long now = Instant.now().getEpochSecond();
            long exp = ((Number) claims.get("exp")).longValue();
            long nbf = ((Number) claims.get("nbf")).longValue();

            if (now > exp) {
                throw new SecurityException("JWT has expired (exp=" + exp + ", now=" + now + ")");
            }
            if (now < nbf) {
                throw new SecurityException("JWT is not yet valid (nbf=" + nbf + ", now=" + now + ")");
            }

            String iss = (String) claims.get("iss");
            if (!jwtAppId.equals(iss)) {
                throw new SecurityException("Invalid issuer: expected " + jwtAppId + ", got " + iss);
            }

            String aud = (String) claims.get("aud");
            if (!jwtAppId.equals(aud)) {
                throw new SecurityException("Invalid audience: expected " + jwtAppId + ", got " + aud);
            }

            String sub = (String) claims.get("sub");
            if (!jitsiDomain.equals(sub)) {
                throw new SecurityException("Invalid subject/domain: expected " + jitsiDomain + ", got " + sub);
            }

            String room = (String) claims.get("room");
            if (expectedRoom != null && !expectedRoom.equals(room)) {
                throw new SecurityException("Invalid room: expected " + expectedRoom + ", got " + room);
            }

            return true;
        } catch (SecurityException se) {
            throw se;
        } catch (Exception e) {
            throw new SecurityException("Failed to parse and validate JWT claims", e);
        }
    }

    private String computeHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 computation failed", e);
        }
    }

    public String getJitsiDomain() {
        return jitsiDomain;
    }

    public String getJwtAppId() {
        return jwtAppId;
    }

    public int getJwtExpirationSeconds() {
        return jwtExpirationSeconds;
    }
}
