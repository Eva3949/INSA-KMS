package com.enterprise.kms.controller;

import com.enterprise.kms.service.MicrosoftGraphService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final MicrosoftGraphService microsoftGraphService;

    public HealthController(MicrosoftGraphService microsoftGraphService) {
        this.microsoftGraphService = microsoftGraphService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "KMS Spring Boot REST Backend");
        response.put("version", "1.0.0");
        response.put("timestamp", System.currentTimeMillis());
        response.put("microsoftGraph", microsoftGraphService.getGraphHealthStatus());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/liveness")
    public ResponseEntity<Map<String, Object>> getLiveness() {
        return ResponseEntity.ok(Map.of("status", "UP", "probe", "liveness"));
    }

    @GetMapping("/readiness")
    public ResponseEntity<Map<String, Object>> getReadiness() {
        Map<String, Object> readiness = new HashMap<>();
        readiness.put("status", "UP");
        readiness.put("probe", "readiness");
        readiness.put("microsoftGraph", microsoftGraphService.getGraphHealthStatus());
        return ResponseEntity.ok(readiness);
    }
}
