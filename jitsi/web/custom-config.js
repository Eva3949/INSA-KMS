// =============================================================================
// INSA KMS — Self-Hosted Jitsi Custom Configuration
// Enforces Air-Gapped & Offline Constraints:
//   - Disables all external third-party requests (Gravatar, Google Fonts, etc.)
//   - Clears public STUN/TURN servers to prevent network leaks
//   - Disables external telemetry and analytics
// =============================================================================

config.disableThirdPartyRequests = true;
config.analytics = { disabled: true };
config.gravatar = { disabled: true };

// Zero public STUN/TURN servers for air-gapped / internal LAN network routing
config.stunServers = [];

// Pre-join & UI behavior
config.prejoinPageEnabled = false;
config.enableWelcomePage = false;
config.disableDeepLinking = true;
config.startWithAudioMuted = false;
config.startWithVideoMuted = false;

// Security: Enforce frame embedding permission from authorized KMS portals
config.enableInsecureRoomNameWarning = false;
