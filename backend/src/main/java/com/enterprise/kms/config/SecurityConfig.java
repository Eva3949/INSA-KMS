package com.enterprise.kms.config;

import com.enterprise.kms.security.KeycloakJwtAuthenticationConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final KeycloakJwtAuthenticationConverter keycloakJwtAuthenticationConverter;
    private final String allowedOriginsStr;

    public SecurityConfig(KeycloakJwtAuthenticationConverter keycloakJwtAuthenticationConverter,
                          @org.springframework.beans.factory.annotation.Value("${kms.cors.allowed-origins:http://localhost:3001,http://localhost:3000,http://127.0.0.1:3001,http://127.0.0.1:3000,http://localhost:8080,http://localhost:8081,http://127.0.0.1:8080,http://127.0.0.1:8081,https://kms.enterprise.internal}") String allowedOriginsStr) {
        this.keycloakJwtAuthenticationConverter = keycloakJwtAuthenticationConverter;
        this.allowedOriginsStr = allowedOriginsStr;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/api/v1/health",
                    "/health/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/api/v1/shares/**",
                    "/api/v1/documents/media/**",
                    "/api/v1/media/**",
                    "/images/**",
                    "/api/v1/admin/settings/storage-config",
                    "/api/v1/auth/forgot-password",
                    "/api/v1/auth/forced-password-change",
                    "/api/v1/auth/login"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .bearerTokenResolver(bearerTokenResolver())
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtAuthenticationConverter))
            );

        return http.build();
    }

    @Bean
    public org.springframework.security.oauth2.server.resource.web.BearerTokenResolver bearerTokenResolver() {
        org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver resolver =
                new org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver();
        resolver.setAllowUriQueryParameter(true);
        return request -> {
            String token = resolver.resolve(request);
            if (token == null) {
                String queryToken = request.getParameter("token");
                if (queryToken != null && !queryToken.isBlank()) {
                    return queryToken.trim();
                }
            }
            return token;
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = new java.util.ArrayList<>(java.util.Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList());
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of(
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
            "HEAD"
        ));
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));
        configuration.setExposedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Location",
            "Content-Disposition"
        ));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
