package com.enterprise.kms.aspect;

public class AuditContext {
    private static final ThreadLocal<String> clientIp = new ThreadLocal<>();
    private static final ThreadLocal<String> userAgent = new ThreadLocal<>();

    public static void setClientIp(String ip) { clientIp.set(ip); }
    public static String getClientIp() { return clientIp.get() != null ? clientIp.get() : "127.0.0.1"; }

    public static void setUserAgent(String agent) { userAgent.set(agent); }
    public static String getUserAgent() { return userAgent.get() != null ? userAgent.get() : "Unknown"; }

    public static void clear() {
        clientIp.remove();
        userAgent.remove();
    }
}
