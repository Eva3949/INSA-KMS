package com.enterprise.kms.controller;

import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.ApprovalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final ApprovalService approvalService;

    public UserController(UserRepository userRepository, ApprovalService approvalService) {
        this.userRepository = userRepository;
        this.approvalService = approvalService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUserProfile(org.springframework.security.core.Authentication auth) {
        String username = SecurityUtils.getCurrentUsername();
        String email = SecurityUtils.getCurrentUserEmail();

        User user = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(email);
                    u.setKeycloakSub(SecurityUtils.getCurrentUserSub());
                    return userRepository.save(u);
                });

        List<String> roles = new java.util.ArrayList<>(auth != null
                ? auth.getAuthorities().stream().map(org.springframework.security.core.GrantedAuthority::getAuthority).filter(r -> r.startsWith("ROLE_")).toList()
                : List.of());
        if (user.getRoleName() != null && !roles.contains(user.getRoleName())) {
            roles.add(user.getRoleName());
        }

        return ResponseEntity.ok(Map.of(
                "id", user.getId().toString(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                "department", user.getDepartment() != null ? user.getDepartment().getName() : "IT Security",
                "roles", roles
        ));
    }

    @GetMapping("/me/approvals")
    public ResponseEntity<List<Map<String, Object>>> getMySubmissions() {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(approvalService.listMySubmissions(username));
    }
}
