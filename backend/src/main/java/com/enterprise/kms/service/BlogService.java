package com.enterprise.kms.service;

import com.enterprise.kms.entity.BlogPost;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.BlogPostRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BlogService {

    private final BlogPostRepository blogPostRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public BlogService(BlogPostRepository blogPostRepository, UserRepository userRepository, AuditService auditService) {
        this.blogPostRepository = blogPostRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> getBlogs(String status, String category, String search, Pageable pageable) {
        String statusFilter = (status != null && !status.isBlank()) ? status.toUpperCase() : null;
        String categoryFilter = (category != null && !category.isBlank()) ? category : null;
        String searchFilter = (search != null && !search.isBlank()) ? search.trim() : null;

        return blogPostRepository.searchBlogs(statusFilter, categoryFilter, searchFilter, pageable);
    }

    public BlogPost getBlogById(UUID id) {
        BlogPost blog = blogPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found with ID: " + id));
        blog.setViewsCount(blog.getViewsCount() + 1);
        return blogPostRepository.save(blog);
    }

    public BlogPost createBlog(String title, String content, String category, String coverImageUrl, String status, String authorUsername) {
        BlogPost blog = new BlogPost();
        blog.setTitle(title);
        blog.setContent(content);
        if (category != null && !category.isBlank()) {
            blog.setCategory(category);
        }
        blog.setCoverImageUrl(coverImageUrl);

        String initStatus = (status != null && status.equalsIgnoreCase("PUBLISHED")) ? "PUBLISHED" : "DRAFT";
        blog.setStatus(initStatus);
        if ("PUBLISHED".equals(initStatus)) {
            blog.setPublishedAt(OffsetDateTime.now());
        }

        if (authorUsername != null && !authorUsername.isBlank()) {
            Optional<User> uOpt = userRepository.findByUsername(authorUsername);
            if (uOpt.isPresent()) {
                blog.setAuthorId(uOpt.get().getId());
                blog.setAuthorName(uOpt.get().getFullName() != null ? uOpt.get().getFullName() : uOpt.get().getUsername());
            } else {
                blog.setAuthorName(authorUsername);
            }
        }

        BlogPost saved = blogPostRepository.save(blog);
        auditService.recordAuditLog(authorUsername, null, "BLOG_CREATE", "BLOG", saved.getId().toString(), null, "Created blog: " + title);
        return saved;
    }

    public BlogPost updateBlog(UUID id, String title, String content, String category, String coverImageUrl, String status, String currentUsername, boolean isAdmin) {
        BlogPost blog = blogPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found with ID: " + id));

        if (!isAdmin && !isAuthor(blog, currentUsername)) {
            throw new SecurityException("You are not authorized to update this blog post");
        }

        if (title != null && !title.isBlank()) blog.setTitle(title);
        if (content != null && !content.isBlank()) blog.setContent(content);
        if (category != null && !category.isBlank()) blog.setCategory(category);
        if (coverImageUrl != null) blog.setCoverImageUrl(coverImageUrl);

        if (status != null && !status.isBlank()) {
            String newStatus = status.toUpperCase();
            if ("PUBLISHED".equals(newStatus) && !"PUBLISHED".equals(blog.getStatus())) {
                blog.setPublishedAt(OffsetDateTime.now());
            }
            blog.setStatus(newStatus);
        }

        BlogPost saved = blogPostRepository.save(blog);
        auditService.recordAuditLog(currentUsername, null, "BLOG_UPDATE", "BLOG", saved.getId().toString(), null, "Updated blog: " + saved.getTitle());
        return saved;
    }

    public BlogPost publishBlog(UUID id, String currentUsername, boolean isAdmin) {
        BlogPost blog = blogPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found with ID: " + id));

        if (!isAdmin && !isAuthor(blog, currentUsername)) {
            throw new SecurityException("You are not authorized to publish this blog post");
        }

        blog.setStatus("PUBLISHED");
        blog.setPublishedAt(OffsetDateTime.now());
        BlogPost saved = blogPostRepository.save(blog);
        auditService.recordAuditLog(currentUsername, null, "BLOG_PUBLISH", "BLOG", saved.getId().toString(), null, "Published blog: " + saved.getTitle());
        return saved;
    }

    public BlogPost unpublishBlog(UUID id, String currentUsername, boolean isAdmin) {
        BlogPost blog = blogPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found with ID: " + id));

        if (!isAdmin && !isAuthor(blog, currentUsername)) {
            throw new SecurityException("You are not authorized to unpublish this blog post");
        }

        blog.setStatus("DRAFT");
        BlogPost saved = blogPostRepository.save(blog);
        auditService.recordAuditLog(currentUsername, null, "BLOG_UNPUBLISH", "BLOG", saved.getId().toString(), null, "Unpublished blog: " + saved.getTitle());
        return saved;
    }

    public void deleteBlog(UUID id, String currentUsername, boolean isAdmin) {
        BlogPost blog = blogPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found with ID: " + id));

        if (!isAdmin && !isAuthor(blog, currentUsername)) {
            throw new SecurityException("You are not authorized to delete this blog post");
        }

        blogPostRepository.delete(blog);
        auditService.recordAuditLog(currentUsername, null, "BLOG_DELETE", "BLOG", id.toString(), null, "Deleted blog: " + blog.getTitle());
    }

    private boolean isAuthor(BlogPost blog, String username) {
        if (username == null) return false;
        if (username.equalsIgnoreCase(blog.getAuthorName())) return true;
        Optional<User> uOpt = userRepository.findByUsername(username);
        return uOpt.isPresent() && uOpt.get().getId().equals(blog.getAuthorId());
    }
}
