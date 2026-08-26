package com.enterprise.kms.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * NFR-01 performance: in-memory cache for high-frequency read paths (search facets,
 * document metadata, retention policy lookups).  Uses ConcurrentMapCacheManager
 * (no external dependency) — swap to Caffeine or Redis for production distributed
 * caching when scaling beyond a single node.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                "searchFacets",
                "documentMetadata",
                "retentionPolicies",
                "systemSettings",
                "documentTypeFields"
        );
    }
}
