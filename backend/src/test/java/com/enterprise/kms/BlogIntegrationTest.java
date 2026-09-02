package com.enterprise.kms;

import com.enterprise.kms.controller.BlogController;
import com.enterprise.kms.entity.BlogPost;
import com.enterprise.kms.repository.BlogPostRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.AuditService;
import com.enterprise.kms.service.BlogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BlogIntegrationTest {

    private BlogPostRepository blogPostRepository;
    private UserRepository userRepository;
    private AuditService auditService;
    private BlogService blogService;
    private BlogController blogController;

    @BeforeEach
    void setUp() {
        blogPostRepository = Mockito.mock(BlogPostRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        auditService = Mockito.mock(AuditService.class);

        blogService = new BlogService(blogPostRepository, userRepository, auditService);
        blogController = new BlogController(blogService);
    }

    @Test
    @DisplayName("Blog Subsystem - Create, Get, Publish, Unpublish, and Delete Lifecycle")
    void testBlogLifecycle() {
        UUID blogId = UUID.randomUUID();
        BlogPost post = new BlogPost();
        post.setId(blogId);
        post.setTitle("INSA Security Guidelines 2026");
        post.setContent("Comprehensive operational security standards...");
        post.setCategory("Security");
        post.setStatus("DRAFT");
        post.setAuthorName("admin.user");

        when(blogPostRepository.save(any(BlogPost.class))).thenAnswer(invocation -> {
            BlogPost saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(blogId);
            return saved;
        });
        when(blogPostRepository.findById(blogId)).thenReturn(Optional.of(post));

        Jwt mockJwt = Mockito.mock(Jwt.class);
        when(mockJwt.getClaimAsString("preferred_username")).thenReturn("admin.user");
        when(mockJwt.getClaim("realm_access")).thenReturn(Map.of("roles", List.of("ROLE_ADMIN")));

        // 1. Create Blog
        Map<String, Object> createReq = Map.of(
                "title", "INSA Security Guidelines 2026",
                "content", "Comprehensive operational security standards...",
                "category", "Security",
                "status", "DRAFT"
        );
        ResponseEntity<BlogPost> createRes = blogController.createBlog(createReq, mockJwt);
        assertEquals(HttpStatus.OK, createRes.getStatusCode());
        assertNotNull(createRes.getBody());
        assertEquals("INSA Security Guidelines 2026", createRes.getBody().getTitle());
        assertEquals("DRAFT", createRes.getBody().getStatus());

        // 2. Publish Blog
        ResponseEntity<BlogPost> publishRes = blogController.publishBlog(blogId, mockJwt);
        assertEquals(HttpStatus.OK, publishRes.getStatusCode());
        assertEquals("PUBLISHED", publishRes.getBody().getStatus());
        assertNotNull(publishRes.getBody().getPublishedAt());

        // 3. Unpublish Blog
        ResponseEntity<BlogPost> unpublishRes = blogController.unpublishBlog(blogId, mockJwt);
        assertEquals(HttpStatus.OK, unpublishRes.getStatusCode());
        assertEquals("DRAFT", unpublishRes.getBody().getStatus());

        // 4. Delete Blog
        ResponseEntity<Void> deleteRes = blogController.deleteBlog(blogId, mockJwt);
        assertEquals(HttpStatus.NO_CONTENT, deleteRes.getStatusCode());
        verify(blogPostRepository, times(1)).delete(post);
    }

    @Test
    @DisplayName("Blog Subsystem - Search and Filter Blogs")
    void testSearchAndFilterBlogs() {
        BlogPost p1 = new BlogPost();
        p1.setId(UUID.randomUUID());
        p1.setTitle("Architecture Review");
        p1.setStatus("PUBLISHED");

        when(blogPostRepository.searchBlogs(eq("PUBLISHED"), eq("Tech"), eq("Architecture"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(p1)));

        var res = blogController.listBlogs("PUBLISHED", "Tech", "Architecture", 0, 10, "createdAt,desc");
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().getTotalElements());
        assertEquals("Architecture Review", res.getBody().getContent().get(0).getTitle());
    }

    @Test
    @DisplayName("Blog Subsystem - Unauthorized Modification Check")
    void testUnauthorizedModification() {
        UUID blogId = UUID.randomUUID();
        BlogPost post = new BlogPost();
        post.setId(blogId);
        post.setTitle("User Notes");
        post.setAuthorName("original.author");

        when(blogPostRepository.findById(blogId)).thenReturn(Optional.of(post));

        Jwt otherUserJwt = Mockito.mock(Jwt.class);
        when(otherUserJwt.getClaimAsString("preferred_username")).thenReturn("other.user");
        when(otherUserJwt.getClaim("realm_access")).thenReturn(Map.of("roles", List.of("ROLE_CONTRIBUTOR")));

        assertThrows(SecurityException.class, () -> {
            blogController.updateBlog(blogId, Map.of("title", "Hacked Title"), otherUserJwt);
        });
    }
}
