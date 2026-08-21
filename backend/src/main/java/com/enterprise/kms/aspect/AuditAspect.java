package com.enterprise.kms.aspect;

import com.enterprise.kms.annotation.AuditLog;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.AuditService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private final AuditService auditService;

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    @AfterReturning(pointcut = "@annotation(auditLog)", returning = "result")
    public void interceptAuditLog(JoinPoint joinPoint, AuditLog auditLog, Object result) {
        String username = SecurityUtils.getCurrentUsername();
        String userEmail = SecurityUtils.getCurrentUserEmail();
        String action = auditLog.action();
        String resourceType = auditLog.resourceType();
        String rawResourceId = result != null ? result.toString() : "N/A";
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
    }
}
