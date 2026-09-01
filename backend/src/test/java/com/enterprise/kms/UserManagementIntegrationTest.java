package com.enterprise.kms;

import com.enterprise.kms.controller.AdminController;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.DepartmentRepository;
import com.enterprise.kms.repository.DocumentRepository;
import com.enterprise.kms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import com.enterprise.kms.service.KeycloakAdminService;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserManagementIntegrationTest {

    private UserRepository userRepository;
    private DocumentRepository documentRepository;
    private DepartmentRepository departmentRepository;
    private KeycloakAdminService keycloakAdminService;
    private AdminController adminController;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        documentRepository = Mockito.mock(DocumentRepository.class);
        departmentRepository = Mockito.mock(DepartmentRepository.class);
        keycloakAdminService = Mockito.mock(KeycloakAdminService.class);
        adminController = new AdminController(userRepository, documentRepository, departmentRepository, null, null, null, null, null, null, keycloakAdminService, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("User Management E2E - List & Search Users")
    void testListAndSearchUsers() {
        User u1 = new User();
        u1.setId(UUID.randomUUID());
        u1.setUsername("test.admin");
        u1.setEmail("admin@enterprise.internal");

        when(userRepository.findAll()).thenReturn(List.of(u1));
        when(userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase("admin", "admin"))
                .thenReturn(List.of(u1));

        ResponseEntity<List<User>> listRes = adminController.getAdminUsers();
        assertEquals(HttpStatus.OK, listRes.getStatusCode());
        assertEquals(1, listRes.getBody().size());

        ResponseEntity<List<User>> searchRes = adminController.searchUsers("admin");
        assertEquals(HttpStatus.OK, searchRes.getStatusCode());
        assertEquals(1, searchRes.getBody().size());
    }

    @Test
    @DisplayName("User Management E2E - Create, View & Edit User Lifecycle")
    void testCreateViewAndEditUserLifecycle() {
        UUID userId = UUID.randomUUID();
        User createdUser = new User();
        createdUser.setId(userId);
        createdUser.setUsername("j.doe");
        createdUser.setEmail("j.doe@enterprise.internal");
        createdUser.setRoleName("ROLE_CONTRIBUTOR");
        createdUser.setIsActive(true);

        when(userRepository.save(any(User.class))).thenReturn(createdUser);
        when(userRepository.findById(userId)).thenReturn(Optional.of(createdUser));

        // 1. Create
        Map<String, String> createReq = Map.of(
                "username", "j.doe",
                "email", "j.doe@enterprise.internal",
                "roleName", "ROLE_CONTRIBUTOR"
        );
        ResponseEntity<User> createRes = adminController.createUser(createReq);
        assertEquals(HttpStatus.CREATED, createRes.getStatusCode());
        assertNotNull(createRes.getBody().getId());
        assertEquals("j.doe", createRes.getBody().getUsername());

        // 2. View
        ResponseEntity<User> viewRes = adminController.getUserById(userId);
        assertEquals(HttpStatus.OK, viewRes.getStatusCode());
        assertEquals("j.doe@enterprise.internal", viewRes.getBody().getEmail());

        // 3. Edit
        Map<String, String> updateReq = Map.of(
                "username", "john.doe",
                "email", "john.doe@enterprise.internal"
        );
        ResponseEntity<User> updateRes = adminController.updateUser(userId, updateReq);
        assertEquals(HttpStatus.OK, updateRes.getStatusCode());
    }

    @Test
    @DisplayName("User Management E2E - Activate, Deactivate & Role Change")
    void testActivateDeactivateAndRoleChange() {
        UUID userId = UUID.randomUUID();
        User testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("test.user");
        testUser.setEmail("test@enterprise.internal");
        testUser.setIsActive(true);
        testUser.setRoleName("ROLE_VIEWER");

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Deactivate
        ResponseEntity<User> deactivateRes = adminController.deactivateUser(userId);
        assertEquals(HttpStatus.OK, deactivateRes.getStatusCode());
        assertFalse(deactivateRes.getBody().getIsActive());

        // Activate
        ResponseEntity<User> activateRes = adminController.activateUser(userId);
        assertEquals(HttpStatus.OK, activateRes.getStatusCode());
        assertTrue(activateRes.getBody().getIsActive());

        // Role Change
        ResponseEntity<User> roleRes = adminController.changeUserRole(userId, Map.of("roleName", "ROLE_CONTENT_OWNER"));
        assertEquals(HttpStatus.OK, roleRes.getStatusCode());
        assertEquals("ROLE_CONTENT_OWNER", roleRes.getBody().getRoleName());
    }

    @Test
    @DisplayName("User Management E2E - Soft Delete & Identity Decoupling")
    void testSoftDeleteUser() {
        UUID userId = UUID.randomUUID();
        User testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("temp.user");
        testUser.setIsActive(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        ResponseEntity<Map<String, String>> deleteRes = adminController.deleteUser(userId);
        assertEquals(HttpStatus.OK, deleteRes.getStatusCode());
        assertFalse(testUser.getIsActive());
        verify(userRepository, times(1)).save(testUser);
    }
}
