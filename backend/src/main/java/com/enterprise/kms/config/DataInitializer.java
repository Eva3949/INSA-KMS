package com.enterprise.kms.config;

import com.enterprise.kms.entity.ApprovalTemplateStep;
import com.enterprise.kms.entity.ApprovalWorkflowTemplate;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.ApprovalTemplateStepRepository;
import com.enterprise.kms.repository.ApprovalWorkflowTemplateRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ApprovalWorkflowTemplateRepository templateRepository;
    private final ApprovalTemplateStepRepository templateStepRepository;
    private final UserRepository userRepository;
    private final com.enterprise.kms.service.KeycloakAdminService keycloakAdminService;

    public DataInitializer(ApprovalWorkflowTemplateRepository templateRepository,
                           ApprovalTemplateStepRepository templateStepRepository,
                           UserRepository userRepository,
                           @org.springframework.beans.factory.annotation.Autowired(required = false) com.enterprise.kms.service.KeycloakAdminService keycloakAdminService) {
        this.templateRepository = templateRepository;
        this.templateStepRepository = templateStepRepository;
        this.userRepository = userRepository;
        this.keycloakAdminService = keycloakAdminService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Upgrade root admin to ROLE_SUPER_ADMIN in database
        userRepository.findByUsername("admin").ifPresent(adminUser -> {
            if (!"ROLE_SUPER_ADMIN".equals(adminUser.getRoleName())) {
                adminUser.setRoleName("ROLE_SUPER_ADMIN");
                userRepository.save(adminUser);
                log.info("Upgraded root user 'admin' to ROLE_SUPER_ADMIN in database");
            }
        });

        // 2. Ensure standard admin_ops exists in database
        if (userRepository.findByUsername("admin_ops").isEmpty()) {
            User opsAdmin = new User();
            opsAdmin.setUsername("admin_ops");
            opsAdmin.setEmail("admin.ops@kms.internal");
            opsAdmin.setFullName("Operations Administrator");
            opsAdmin.setRoleName("ROLE_ADMIN");
            opsAdmin.setJobTitle("Operations Admin");
            opsAdmin.setEmploymentStatus("ACTIVE");
            opsAdmin.setIsActive(true);
            opsAdmin.setKeycloakSub("admin_ops_sub_" + java.util.UUID.randomUUID());
            userRepository.save(opsAdmin);
            log.info("Created standard admin user 'admin_ops' in database");
        }

        // 3. Ensure Keycloak has admin_ops user with ROLE_ADMIN
        if (keycloakAdminService != null) {
            try {
                keycloakAdminService.createUser(
                        "admin_ops",
                        "admin.ops@kms.internal",
                        "Operations",
                        "Admin",
                        "adminops123",
                        "ROLE_ADMIN",
                        false
                );
                Map<String, Object> kcUser = keycloakAdminService.findUserByUsername("admin_ops");
                if (kcUser != null && kcUser.get("id") != null) {
                    keycloakAdminService.clearRequiredActions(kcUser.get("id").toString());
                }
                log.info("Synchronized 'admin_ops' into Keycloak with ROLE_ADMIN");
            } catch (Exception e) {
                log.warn("Keycloak sync for admin_ops: {}", e.getMessage());
            }
        }

        if (templateRepository.count() > 0) {
            log.info("Approval templates already exist — skipping seed.");
            return;
        }

        List<User> admins = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase("admin", "admin");
        User approver;
        if (!admins.isEmpty()) {
            approver = admins.get(0);
        } else {
            List<User> allUsers = userRepository.findAll();
            if (allUsers.isEmpty()) {
                log.warn("No users found — cannot seed default approval template.");
                return;
            }
            approver = allUsers.get(0);
            log.info("No admin user found — using '{}' as default approver.", approver.getUsername());
        }
        log.info("Seeding default approval template with approver: {}", approver.getUsername());

        ApprovalWorkflowTemplate template = new ApprovalWorkflowTemplate();
        template.setName("Standard Document Review");
        template.setDescription("Default single-step approval workflow. An admin/content-owner reviews and approves or rejects the document.");
        template.setIsActive(true);
        template = templateRepository.save(template);

        ApprovalTemplateStep step = new ApprovalTemplateStep();
        step.setTemplate(template);
        step.setStepNumber(1);
        step.setApprover(approver);
        templateStepRepository.save(step);

        log.info("Default approval template '{}' created (id={})", template.getName(), template.getId());
    }
}
