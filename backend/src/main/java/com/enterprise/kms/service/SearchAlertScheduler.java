package com.enterprise.kms.service;

import com.enterprise.kms.entity.SavedSearch;
import com.enterprise.kms.entity.User;
import com.enterprise.kms.repository.SavedSearchRepository;
import com.enterprise.kms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * FR-15: Periodically re-runs saved searches with alerts enabled
 * and sends email notifications when new results are found.
 */
@Service
public class SearchAlertScheduler {

    private static final Logger log = LoggerFactory.getLogger(SearchAlertScheduler.class);

    private final SavedSearchRepository savedSearchRepository;
    private final UserRepository userRepository;
    private final SearchService searchService;
    private final NotificationService notificationService;

    public SearchAlertScheduler(SavedSearchRepository savedSearchRepository,
                                 UserRepository userRepository,
                                 SearchService searchService,
                                 NotificationService notificationService) {
        this.savedSearchRepository = savedSearchRepository;
        this.userRepository = userRepository;
        this.searchService = searchService;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 */30 * * * *") // every 30 minutes
    @Transactional
    public void runSearchAlerts() {
        List<SavedSearch> alertSearches = savedSearchRepository.findByAlertEnabledTrue();
        log.info("FR-15: Processing {} saved searches with alerts enabled", alertSearches.size());

        for (SavedSearch savedSearch : alertSearches) {
            try {
                if (!shouldRun(savedSearch)) continue;

                User user = savedSearch.getUser();
                if (user == null) continue;

                String query = savedSearch.getQueryJson();
                if (query == null || query.isBlank()) continue;

                var results = searchService.searchDocuments(query, null, null, null, null, null, null,
                        org.springframework.data.domain.PageRequest.of(0, 10));

                if (results != null && results.getTotalElements() > 0) {
                    String message = String.format(
                            "New results found for saved search \"%s\" — %d document(s) matched.",
                            savedSearch.getName(), results.getTotalElements());

                    String searchUrl = "/search?q=" + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8);

                    notificationService.sendNotification(
                            user.getUsername(),
                            "Search Alert: " + savedSearch.getName(),
                            message,
                            com.enterprise.kms.entity.NotificationEventType.SEARCH_ALERT,
                            "SAVED_SEARCH",
                            savedSearch.getId(),
                            searchUrl);

                    log.info("FR-15: Alert sent to {} for search '{}'", user.getUsername(), savedSearch.getName());
                }

                savedSearch.setLastAlertAt(OffsetDateTime.now());
                savedSearchRepository.save(savedSearch);

            } catch (Exception e) {
                log.error("FR-15: Failed to process alert for search id={}: {}", savedSearch.getId(), e.getMessage());
            }
        }
    }

    private boolean shouldRun(SavedSearch savedSearch) {
        if (savedSearch.getLastAlertAt() == null) return true;

        String freq = savedSearch.getAlertFrequency();
        if (freq == null) freq = "DAILY";

        OffsetDateTime lastAlert = savedSearch.getLastAlertAt();
        OffsetDateTime now = OffsetDateTime.now();

        return switch (freq.toUpperCase()) {
            case "HOURLY" -> now.isAfter(lastAlert.plusHours(1));
            case "DAILY" -> now.isAfter(lastAlert.plusDays(1));
            case "WEEKLY" -> now.isAfter(lastAlert.plusWeeks(1));
            default -> now.isAfter(lastAlert.plusDays(1));
        };
    }
}
