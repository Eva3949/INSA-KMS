package com.enterprise.kms.controller;

import com.enterprise.kms.entity.BlogPost;
import com.enterprise.kms.service.BlogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/blogs")
public class BlogController {

    private final BlogService blogService;

    public BlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    private String getUsername(Jwt jwt) {
        if (jwt == null) return "anonymous";
        String preferred = jwt.getClaimAsString("preferred_username");
        return preferred != null ? preferred : jwt.getSubject();
    }

    private boolean isAdmin(Jwt jwt) {
        if (jwt == null) return false;
        Object realmAccess = jwt.getClaim("realm_access");
        if (realmAccess instanceof Map<?, ?> map) {
            Object roles = map.get("roles");
            if (roles instanceof Iterable<?> list) {
                for (Object r : list) {
                    if ("ROLE_ADMIN".equalsIgnoreCase(String.valueOf(r)) || "ADMIN".equalsIgnoreCase(String.valueOf(r))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<BlogPost>> listBlogs(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        String[] sortParts = sort.split(",");
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = sortParts[0];

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(blogService.getBlogs(status, category, search, pageRequest));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BlogPost> getBlogById(@PathVariable UUID id) {
        return ResponseEntity.ok(blogService.getBlogById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_IT_SECURITY', 'ROLE_COMPLIANCE_OFFICER', 'ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<BlogPost> createBlog(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        String category = (String) payload.get("category");
        String coverImageUrl = (String) payload.get("coverImageUrl");
        String status = (String) payload.get("status");

        if (title == null || title.isBlank() || content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(blogService.createBlog(title, content, category, coverImageUrl, status, getUsername(jwt)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_IT_SECURITY', 'ROLE_COMPLIANCE_OFFICER', 'ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<BlogPost> updateBlog(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal Jwt jwt) {
        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        String category = (String) payload.get("category");
        String coverImageUrl = (String) payload.get("coverImageUrl");
        String status = (String) payload.get("status");

        return ResponseEntity.ok(blogService.updateBlog(id, title, content, category, coverImageUrl, status, getUsername(jwt), isAdmin(jwt)));
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_IT_SECURITY', 'ROLE_COMPLIANCE_OFFICER', 'ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<BlogPost> publishBlog(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(blogService.publishBlog(id, getUsername(jwt), isAdmin(jwt)));
    }

    @PutMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_IT_SECURITY', 'ROLE_COMPLIANCE_OFFICER', 'ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<BlogPost> unpublishBlog(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(blogService.unpublishBlog(id, getUsername(jwt), isAdmin(jwt)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_IT_SECURITY', 'ROLE_COMPLIANCE_OFFICER', 'ADMIN', 'CONTENT_OWNER', 'CONTRIBUTOR')")
    public ResponseEntity<Void> deleteBlog(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        blogService.deleteBlog(id, getUsername(jwt), isAdmin(jwt));
        return ResponseEntity.noContent().build();
    }
}
