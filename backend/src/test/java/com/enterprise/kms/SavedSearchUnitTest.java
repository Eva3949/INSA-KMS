package com.enterprise.kms;

import com.enterprise.kms.controller.SavedSearchController;
import com.enterprise.kms.entity.SavedSearch;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.SavedSearchRepository;
import com.enterprise.kms.repository.UserRepository;
import com.enterprise.kms.service.SavedSearchService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SavedSearchUnitTest {

    private SavedSearchRepository savedSearchRepository;
    private UserRepository userRepository;
    private SavedSearchService savedSearchService;
    private SavedSearchController savedSearchController;

    private static final String TEST_USER = "test.employee";
    private static final String TEST_EMAIL = "test.employee@enterprise.internal";
    private User mockUser;

    @BeforeEach
    void setUp() {
        savedSearchRepository = Mockito.mock(SavedSearchRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        savedSearchService = new SavedSearchService(savedSearchRepository, userRepository);
        savedSearchController = new SavedSearchController(savedSearchService, userRepository);

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setUsername(TEST_USER);
        mockUser.setEmail(TEST_EMAIL);

        when(userRepository.findByUsername(TEST_USER)).thenReturn(Optional.of(mockUser));
        when(userRepository.findById(mockUser.getId())).thenReturn(Optional.of(mockUser));

        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .claim("preferred_username", TEST_USER)
                .claim("email", TEST_EMAIL)
                .claim("sub", "keycloak-sub-123")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        Authentication auth = new UsernamePasswordAuthenticationToken(
                jwt,
                "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Create Saved Search - Persists structured query JSON and alert preferences")
    void testCreateSavedSearchSuccess() {
        UUID searchId = UUID.randomUUID();
        when(savedSearchRepository.save(any(SavedSearch.class))).thenAnswer(invocation -> {
            SavedSearch ss = invocation.getArgument(0);
            ss.setId(searchId);
            return ss;
        });

        String queryJson = "{\"query\":\"KMS\",\"deptId\":\"dept-1\",\"confidentiality\":\"INTERNAL\"}";
        Map<String, Object> req = Map.of(
                "name", "KMS Security Policies",
                "queryJson", queryJson,
                "alertEnabled", true,
                "alertFrequency", "HOURLY"
        );

        ResponseEntity<Map<String, Object>> response = savedSearchController.createSavedSearch(req);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("KMS Security Policies", response.getBody().get("name"));
        assertEquals(queryJson, response.getBody().get("queryJson"));
        assertEquals(true, response.getBody().get("alertEnabled"));
        assertEquals("HOURLY", response.getBody().get("alertFrequency"));
    }

    @Test
    @DisplayName("List Saved Searches - Returns only searches belonging to the authenticated user")
    void testListSavedSearches() {
        SavedSearch ss1 = new SavedSearch();
        ss1.setId(UUID.randomUUID());
        ss1.setUser(mockUser);
        ss1.setName("Audit Search");
        ss1.setQueryJson("{\"query\":\"Audit\"}");
        ss1.setAlertEnabled(false);

        when(savedSearchRepository.findByUserIdOrderByCreatedAtDesc(mockUser.getId())).thenReturn(List.of(ss1));

        ResponseEntity<?> response = savedSearchController.listSavedSearches();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof List);
        List<?> list = (List<?>) response.getBody();
        assertEquals(1, list.size());
    }

    @Test
    @DisplayName("Update Saved Search - Updates alert settings")
    void testUpdateSavedSearch() {
        UUID searchId = UUID.randomUUID();
        SavedSearch ss = new SavedSearch();
        ss.setId(searchId);
        ss.setUser(mockUser);
        ss.setName("Old Name");
        ss.setAlertEnabled(false);

        when(savedSearchRepository.findById(searchId)).thenReturn(Optional.of(ss));

        ResponseEntity<Map<String, Object>> response = savedSearchController.updateSavedSearch(
                searchId,
                Map.of("alertEnabled", true, "alertFrequency", "WEEKLY")
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(ss.getAlertEnabled());
        assertEquals("WEEKLY", ss.getAlertFrequency());
        verify(savedSearchRepository, times(1)).save(ss);
    }

    @Test
    @DisplayName("Delete Saved Search - Verifies user ownership before deleting")
    void testDeleteSavedSearch() {
        UUID searchId = UUID.randomUUID();
        SavedSearch ss = new SavedSearch();
        ss.setId(searchId);
        ss.setUser(mockUser);

        when(savedSearchRepository.findById(searchId)).thenReturn(Optional.of(ss));

        ResponseEntity<Map<String, Object>> response = savedSearchController.deleteSavedSearch(searchId);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(savedSearchRepository, times(1)).delete(ss);
    }
}
