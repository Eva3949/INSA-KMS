package com.enterprise.kms.aspect;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.entity.Document;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {
    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);
    private final AuditService auditService;

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    @AfterReturning(pointcut = "@annotation(auditLog)", returning = "result")
    public void interceptAuditLog(JoinPoint joinPoint, AuditLog auditLog, Object result) {
        try {
            String username = SecurityUtils.getCurrentUsername();
            String userEmail = SecurityUtils.getCurrentUserEmail();
            String action = auditLog.action();
            String resourceType = auditLog.resourceType();

            Object body = (result instanceof ResponseEntity<?> re) ? re.getBody() : result;
            String rawResourceId = resolveResourceId(joinPoint, body);

            String resourceId = rawResourceId.length() > 100 ? rawResourceId.substring(0, 97) + "..." : rawResourceId;
            String ipAddress = AuditContext.getClientIp();

            auditService.recordAuditLog(
                    username,
                    userEmail,
                    action,
                    resourceType,
                    resourceId,
                    ipAddress,
                    "{\"method\":\"" + joinPoint.getSignature().getName() + "\"}"
            );
        } catch (Exception e) {
            log.error("Failed to record audit log for action: {}", auditLog.action(), e);
        }
    }

    /**
     * Resolves the audited resource id. A UUID method argument (the path variable) is the most
     * reliable source; response bodies are only used as a fallback, and never stringified
     * wholesale — dumping a serialised body here previously wrote unusable resource ids.
     */
    private String resolveResourceId(JoinPoint joinPoint, Object body) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof java.util.UUID uuid) {
                return uuid.toString();
            }
        }
        if (body instanceof Document doc && doc.getId() != null) {
            return doc.getId().toString();
        }
        if (body instanceof java.util.Map<?, ?> map) {
            Object id = map.get("id");
            if (id != null) {
                return id.toString();
            }
        }
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof String s && !s.isBlank()) {
                return s.length() > 100 ? s.substring(0, 97) + "..." : s;
            }
        }
        return "N/A";
    }
}
