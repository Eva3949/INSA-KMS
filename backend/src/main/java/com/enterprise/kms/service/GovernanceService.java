package com.enterprise.kms.service;

import com.enterprise.kms.entity.LegalHold;
import com.enterprise.kms.entity.RetentionPolicy;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.LegalHoldRepository;
import com.enterprise.kms.repository.RetentionPolicyRepository;
import com.enterprise.kms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class GovernanceService {
    private final RetentionPolicyRepository retentionPolicyRepository;
    private final LegalHoldRepository legalHoldRepository;
    private final UserRepository userRepository;

    public GovernanceService(RetentionPolicyRepository retentionPolicyRepository,
                             LegalHoldRepository legalHoldRepository,
                             UserRepository userRepository) {
        this.retentionPolicyRepository = retentionPolicyRepository;
        this.legalHoldRepository = legalHoldRepository;
        this.userRepository = userRepository;
    }

    public List<RetentionPolicy> getRetentionPolicies() {
        return retentionPolicyRepository.findAll();
    }

    public List<LegalHold> getLegalHolds() {
        return legalHoldRepository.findAll();
    }

    @Transactional
    public LegalHold createLegalHold(String caseNumber, String title, String description, String username) {
        User creator = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUsername(username);
                    u.setEmail(username + "@enterprise.internal");
                    u.setKeycloakSub("sub-" + username);
                    return userRepository.save(u);
                });

        LegalHold hold = new LegalHold();
        hold.setCaseNumber(caseNumber);
        hold.setTitle(title);
        hold.setDescription(description);
        hold.setCreatedBy(creator);
        return legalHoldRepository.save(hold);
    }
}
