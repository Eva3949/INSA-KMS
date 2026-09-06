package com.enterprise.kms.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class SecurityUtils {

    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return "system";
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String username = jwt.getClaimAsString("preferred_username");
            return username != null ? username : jwt.getSubject();
        }
        return auth.getName();
    }

    public static String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaimAsString("email");
        }
        return getCurrentUsername() + "@enterprise.internal";
    }

    public static String getCurrentUserSub() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return "sub-" + getCurrentUsername();
    }

    public static boolean isSystemAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") ||
                               a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR") ||
                               a.getAuthority().equals("ADMIN") ||
                               a.getAuthority().equals("SYSTEM_ADMINISTRATOR") ||
                               a.getAuthority().equals("ROLE_SUPER_ADMIN") ||
                               a.getAuthority().equals("SUPER_ADMIN"));
    }

    public static java.util.Set<String> getCurrentRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        java.util.Set<String> roles = new java.util.HashSet<>();
        if (auth != null && auth.isAuthenticated()) {
            for (org.springframework.security.core.GrantedAuthority ga : auth.getAuthorities()) {
                String a = ga.getAuthority();
                if (a != null) {
                    roles.add(a.toUpperCase());
                    if (a.startsWith("ROLE_")) {
                        roles.add(a.substring(5).toUpperCase());
                    } else {
                        roles.add("ROLE_" + a.toUpperCase());
                    }
                }
            }
        }
        return roles;
    }

    public static boolean hasAnyRole(String... checkRoles) {
        java.util.Set<String> current = getCurrentRoles();
        for (String r : checkRoles) {
            if (r != null) {
                String upper = r.toUpperCase();
                if (current.contains(upper)) return true;
                if (!upper.startsWith("ROLE_") && current.contains("ROLE_" + upper)) return true;
                if (upper.startsWith("ROLE_") && current.contains(upper.substring(5))) return true;
            }
        }
        return false;
    }

    public static boolean isViewerOnly() {
        java.util.Set<String> roles = getCurrentRoles();
        boolean hasViewer = roles.contains("ROLE_VIEWER") || roles.contains("VIEWER");
        boolean hasHigherRole = roles.contains("ROLE_ADMIN") || roles.contains("ADMIN")
                || roles.contains("ROLE_SUPER_ADMIN") || roles.contains("SUPER_ADMIN")
                || roles.contains("ROLE_SYSTEM_ADMINISTRATOR") || roles.contains("SYSTEM_ADMINISTRATOR")
                || roles.contains("ROLE_CONTENT_OWNER") || roles.contains("CONTENT_OWNER")
                || roles.contains("ROLE_CONTRIBUTOR") || roles.contains("CONTRIBUTOR")
                || roles.contains("ROLE_COMPLIANCE_OFFICER") || roles.contains("COMPLIANCE_OFFICER")
                || roles.contains("ROLE_IT_SECURITY") || roles.contains("IT_SECURITY");
        return hasViewer && !hasHigherRole;
    }
}

