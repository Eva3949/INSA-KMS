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

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ApprovalWorkflowTemplateRepository templateRepository;
    private final ApprovalTemplateStepRepository templateStepRepository;
    private final UserRepository userRepository;

    public DataInitializer(ApprovalWorkflowTemplateRepository templateRepository,
                           ApprovalTemplateStepRepository templateStepRepository,
                           UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.templateStepRepository = templateStepRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
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
