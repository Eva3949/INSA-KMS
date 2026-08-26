package com.enterprise.kms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class BackupService {
    private static final Logger log = LoggerFactory.getLogger(BackupService.class);

    private final SystemSettingService systemSettingService;

    @Value("${kms.backup.enabled:false}")
    private boolean backupEnabled;

    @Value("${kms.backup.location:./backups}")
    private String backupLocation;

    @Value("${kms.backup.db-url:}")
    private String dbUrl;

    @Value("${kms.backup.db-user:}")
    private String dbUser;

    public BackupService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    @Scheduled(cron = "${kms.backup.cron:0 0 2 * * *}")
    public void runScheduledBackup() {
        if (!backupEnabled) {
            log.debug("Scheduled backup skipped (kms.backup.enabled=false)");
            return;
        }
        try {
            Map<String, Object> result = executeBackup();
            log.info("Scheduled backup completed: {}", result);
        } catch (Exception e) {
            log.error("Scheduled backup failed", e);
            systemSettingService.updateSettings(Map.of(
                    "backup.last-status", "FAILED",
                    "backup.last-error", e.getMessage() != null ? e.getMessage() : "Unknown error",
                    "backup.last-run-at", OffsetDateTime.now().toString()));
        }
    }

    public Map<String, Object> executeBackup() {
        Map<String, Object> result = new LinkedHashMap<>();
        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String fileName = "kms_backup_" + timestamp + ".sql";

        try {
            Path backupDir = Path.of(backupLocation);
            Files.createDirectories(backupDir);

            String jdbcUrl = dbUrl;
            if (jdbcUrl == null || jdbcUrl.isBlank()) {
                jdbcUrl = resolveJdbcUrl();
            }

            String host = extractHost(jdbcUrl);
            String port = extractPort(jdbcUrl);
            String dbName = extractDbName(jdbcUrl);

            if (dbUser == null || dbUser.isBlank()) {
                dbUser = "insakms_user";
            }

            ProcessBuilder pb = new ProcessBuilder(
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", dbUser,
                    "-d", dbName,
                    "-f", backupDir.resolve(fileName).toAbsolutePath().toString(),
                    "--no-owner",
                    "--no-privileges");
            pb.environment().put("PGPASSWORD", resolveDbPassword());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            int exitCode = process.waitFor();

            File backupFile = backupDir.resolve(fileName).toFile();
            long fileSize = backupFile.exists() ? backupFile.length() : 0;

            if (exitCode == 0) {
                result.put("status", "SUCCESS");
                result.put("file", fileName);
                result.put("filePath", backupDir.resolve(fileName).toAbsolutePath().toString());
                result.put("fileSizeBytes", fileSize);
                systemSettingService.updateSettings(Map.of(
                        "backup.last-status", "SUCCESS",
                        "backup.last-run-at", OffsetDateTime.now().toString(),
                        "backup.last-file", fileName));
            } else {
                result.put("status", "FAILED");
                result.put("exitCode", exitCode);
                result.put("output", output.toString());
                systemSettingService.updateSettings(Map.of(
                        "backup.last-status", "FAILED",
                        "backup.last-run-at", OffsetDateTime.now().toString(),
                        "backup.last-error", output.toString()));
            }
        } catch (java.io.IOException e) {
            if (e.getMessage() != null && e.getMessage().contains("pg_dump")) {
                result.put("status", "FAILED");
                result.put("error", "pg_dump not found. Install PostgreSQL client tools or set KMS_BACKUP_DB_URL.");
                result.put("hint", "On Windows, add PostgreSQL bin to PATH or use: set PATH=%PATH%;C:\\Program Files\\PostgreSQL\\16\\bin");
            } else {
                result.put("status", "FAILED");
                result.put("error", e.getMessage());
            }
            log.warn("Backup I/O error: {}", e.getMessage());
        } catch (Exception e) {
            result.put("status", "FAILED");
            result.put("error", e.getMessage());
            log.warn("Backup error: {}", e.getMessage());
        }

        return result;
    }

    private String resolveJdbcUrl() {
        String url = systemSettingService.getSettingValue("backup.jdbc-url", "");
        if (url != null && !url.isBlank()) return url;
        String envUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (envUrl != null && !envUrl.isBlank()) return envUrl;
        envUrl = System.getenv("DB_URL");
        if (envUrl != null && !envUrl.isBlank()) return envUrl;
        return "jdbc:postgresql://localhost:5432/insakms";
    }

    private String resolveDbPassword() {
        String pw = System.getenv("SPRING_DATASOURCE_PASSWORD");
        if (pw != null && !pw.isBlank()) return pw;
        pw = System.getenv("DB_PASS");
        if (pw != null && !pw.isBlank()) return pw;
        return "";
    }

    private String extractHost(String jdbcUrl) {
        try {
            String stripped = jdbcUrl.substring(jdbcUrl.indexOf("://") + 3);
            if (stripped.startsWith("[")) return stripped.substring(1, stripped.indexOf("]"));
            return stripped.substring(0, stripped.indexOf(":"));
        } catch (Exception e) {
            return "localhost";
        }
    }

    private String extractPort(String jdbcUrl) {
        try {
            String stripped = jdbcUrl.substring(jdbcUrl.indexOf("://") + 3);
            int hostEnd = stripped.indexOf("/");
            int portStart = stripped.indexOf(":", stripped.indexOf("]"));
            if (portStart < 0 || portStart > hostEnd) return "5432";
            return stripped.substring(portStart + 1, hostEnd);
        } catch (Exception e) {
            return "5432";
        }
    }

    private String extractDbName(String jdbcUrl) {
        try {
            String stripped = jdbcUrl.substring(jdbcUrl.indexOf("://") + 3);
            String afterHost = stripped.substring(stripped.indexOf("/") + 1);
            int queryStart = afterHost.indexOf("?");
            return queryStart > 0 ? afterHost.substring(0, queryStart) : afterHost;
        } catch (Exception e) {
            return "insakms";
        }
    }

    public Map<String, Object> restoreBackup(String fileName) {
        Map<String, Object> result = new LinkedHashMap<>();
        Path backupDir = Path.of(backupLocation);
        Path backupFile = backupDir.resolve(fileName);

        if (!Files.exists(backupFile)) {
            result.put("status", "FAILED");
            result.put("error", "Backup file not found: " + fileName);
            return result;
        }

        try {
            String jdbcUrl = resolveJdbcUrl();
            String host = extractHost(jdbcUrl);
            String port = extractPort(jdbcUrl);
            String dbName = extractDbName(jdbcUrl);
            if (dbUser == null || dbUser.isBlank()) dbUser = "insakms_user";

            ProcessBuilder pb = new ProcessBuilder(
                    "psql",
                    "-h", host,
                    "-p", port,
                    "-U", dbUser,
                    "-d", dbName,
                    "-f", backupFile.toAbsolutePath().toString(),
                    "--single-transaction",
                    "--no-password");
            pb.environment().put("PGPASSWORD", resolveDbPassword());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) output.append(line).append("\n");
            }
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                result.put("status", "SUCCESS");
                result.put("restoredFrom", fileName);
                result.put("restoredAt", OffsetDateTime.now().toString());
                systemSettingService.updateSettings(Map.of(
                        "backup.last-restore-at", OffsetDateTime.now().toString(),
                        "backup.last-restore-file", fileName));
            } else {
                result.put("status", "FAILED");
                result.put("exitCode", exitCode);
                result.put("output", output.toString());
            }
        } catch (Exception e) {
            result.put("status", "FAILED");
            result.put("error", e.getMessage());
            log.warn("Restore error: {}", e.getMessage());
        }
        return result;
    }

    public java.util.List<Map<String, Object>> listBackupFiles() {
        Path backupDir = Path.of(backupLocation);
        java.util.List<Map<String, Object>> files = new java.util.ArrayList<>();
        if (!Files.exists(backupDir)) return files;

        try (var stream = Files.list(backupDir)) {
            stream.filter(p -> p.toString().endsWith(".sql"))
                    .sorted((a, b) -> b.getFileName().toString().compareTo(a.getFileName().toString()))
                    .forEach(p -> {
                        Map<String, Object> entry = new LinkedHashMap<>();
                        entry.put("fileName", p.getFileName().toString());
                        entry.put("fileSizeBytes", p.toFile().length());
                        entry.put("createdAt", java.time.Instant.ofEpochMilli(p.toFile().lastModified()).toString());
                        files.add(entry);
                    });
        } catch (Exception e) {
            log.warn("Could not list backup files: {}", e.getMessage());
        }
        return files;
    }

    public Map<String, Object> getDurabilityStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("backupEnabled", backupEnabled);
        status.put("backupLocation", backupLocation);
        status.put("lastBackupAt", systemSettingService.getSettingValue("backup.last-run-at", ""));
        status.put("lastBackupStatus", systemSettingService.getSettingValue("backup.last-status", ""));
        status.put("lastRestoreAt", systemSettingService.getSettingValue("backup.last-restore-at", ""));
        status.put("rpoHours", systemSettingService.getSettingValue("backup.rpo-hours", "24"));
        status.put("rtoHours", systemSettingService.getSettingValue("backup.rto-hours", "4"));
        status.put("backupFiles", listBackupFiles());
        return status;
    }
}