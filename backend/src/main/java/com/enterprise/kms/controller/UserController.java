package com.enterprise.kms.controller;

import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.security.SecurityUtils;
import com.enterprise.kms.service.ApprovalService;
import com.enterprise.kms.service.StorageService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private static final long MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpeg",
            ".jpg",
            ".png",
            ".webp"
    );

    private final UserRepository userRepository;
    private final ApprovalService approvalService;
    private final StorageService storageService;

    public UserController(UserRepository userRepository,
                          ApprovalService approvalService,
                          StorageService storageService) {
        this.userRepository = userRepository;
        this.approvalService = approvalService;
        this.storageService = storageService;
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

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", user.getId().toString());
        resp.put("username", user.getUsername());
        resp.put("email", user.getEmail());
        resp.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        resp.put("department", user.getDepartment() != null ? user.getDepartment().getName() : "IT Security");
        resp.put("roles", roles);
        resp.put("avatarUrl", user.getAvatarUrl());
        resp.put("jobTitle", user.getJobTitle());
        resp.put("phone", user.getPhone());
        resp.put("employmentStatus", user.getEmploymentStatus());

        return ResponseEntity.ok(resp);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select an image file to upload.");
        }

        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile image must be less than 5 MB in size.");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        boolean validContentType = ALLOWED_IMAGE_TYPES.contains(contentType);
        boolean validExtension = ALLOWED_EXTENSIONS.stream().anyMatch(originalFilename::endsWith);

        if (!validContentType && !validExtension) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image format. Allowed formats are JPG, JPEG, PNG, and WebP.");
        }

        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(SecurityUtils.getCurrentUserEmail());
                    u.setKeycloakSub(SecurityUtils.getCurrentUserSub());
                    return userRepository.save(u);
                });

        // Delete previous avatar file if exists
        if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
            storageService.deleteAvatarFile(user.getAvatarUrl());
        }

        String newAvatarUrl = storageService.storeAvatar(file, username);
        user.setAvatarUrl(newAvatarUrl);
        user = userRepository.save(user);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", "SUCCESS");
        resp.put("message", "Profile photo updated successfully");
        resp.put("avatarUrl", user.getAvatarUrl());
        resp.put("username", user.getUsername());

        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<Map<String, Object>> deleteAvatar() {
        String username = SecurityUtils.getCurrentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found."));

        if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
            storageService.deleteAvatarFile(user.getAvatarUrl());
            user.setAvatarUrl(null);
            userRepository.save(user);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", "SUCCESS");
        resp.put("message", "Profile photo removed successfully");
        resp.put("avatarUrl", null);

        return ResponseEntity.ok(resp);
    }

    @GetMapping("/avatar/{fileName:.+}")
    @CrossOrigin(origins = "*")
    public ResponseEntity<InputStreamResource> getAvatar(@PathVariable("fileName") String fileName) {
        if (fileName == null || fileName.isBlank() || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\") || fileName.contains("\0")) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Path filePath = storageService.loadAvatar(fileName);
            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                return ResponseEntity.notFound().build();
            }

            MediaType mediaType = MediaType.IMAGE_PNG;
            String lower = fileName.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (lower.endsWith(".webp")) {
                mediaType = MediaType.parseMediaType("image/webp");
            } else if (lower.endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                    .body(new InputStreamResource(Files.newInputStream(filePath)));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/me/approvals")
    public ResponseEntity<List<Map<String, Object>>> getMySubmissions() {
        String username = SecurityUtils.getCurrentUsername();
        return ResponseEntity.ok(approvalService.listMySubmissions(username));
    }
}
