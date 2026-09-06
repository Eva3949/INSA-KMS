package com.enterprise.kms;

import com.enterprise.kms.controller.NotificationController;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

class NotificationControllerTest {

    private NotificationService notificationService;
    private UserRepository userRepository;
    private NotificationController controller;

    @BeforeEach
    void setUp() {
        notificationService = Mockito.mock(NotificationService.class);
        userRepository = Mockito.mock(UserRepository.class);
        controller = new NotificationController(notificationService, userRepository);

        // Mock SecurityContextHolder with authenticated Jwt user
        Jwt jwt = Mockito.mock(Jwt.class);
        when(jwt.getClaimAsString("preferred_username")).thenReturn("john_doe");
        when(jwt.getSubject()).thenReturn("sub-12345");
        when(jwt.getClaimAsString("email")).thenReturn("john@enterprise.internal");

        Authentication authentication = Mockito.mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(authentication.getName()).thenReturn("john_doe");

        SecurityContext securityContext = Mockito.mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("markAllRead: Successfully marks all notifications read for resolved user")
    void testMarkAllRead() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setUsername("john_doe");

        when(userRepository.findByUsername("john_doe")).thenReturn(Optional.of(user));

        ResponseEntity<Map<String, Object>> response = controller.markAllRead();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ALL_READ", response.getBody().get("status"));

        verify(notificationService, times(1)).markAllRead(userId);
    }

    @Test
    @DisplayName("markRead: Successfully marks single notification read for resolved user")
    void testMarkRead() {
        UUID userId = UUID.randomUUID();
        UUID notifId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setUsername("john_doe");

        when(userRepository.findByUsername("john_doe")).thenReturn(Optional.of(user));

        ResponseEntity<Map<String, Object>> response = controller.markRead(notifId);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("READ", response.getBody().get("status"));

        verify(notificationService, times(1)).markRead(notifId, userId);
    }

    @Test
    @DisplayName("getUnreadCount: Returns unread notification count for resolved user")
    void testGetUnreadCount() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setUsername("john_doe");

        when(userRepository.findByUsername("john_doe")).thenReturn(Optional.of(user));
        when(notificationService.countUnread(userId)).thenReturn(5L);

        ResponseEntity<Map<String, Object>> response = controller.getUnreadCount();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(5L, response.getBody().get("unreadCount"));
        assertEquals(5L, response.getBody().get("count"));

        verify(notificationService, times(1)).countUnread(userId);
    }
}
