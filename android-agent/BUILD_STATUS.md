# Sentinel AI build status

## Completed
- Android Gradle project structure
- Application module and package identity
- Main activity with explicit Accessibility Settings entry
- Visible Stop Agent action
- AccessibilityService declaration and configuration
- User-controlled, non-autonomous service shell
- Android Keystore-backed secure local token storage (`SecureTokenStore`)
- One-time, 6-digit authenticated device pairing
- Device-scoped JWT credential exchange
- HTTPS authenticated heartbeat and command channel
- Server-side allow-list and queued command delivery
- Foreground authenticated Android channel service
- Allow-listed command receiver (`open_url`, `device_status`, `stop_agent`)
- Automatic channel restart on app launch when already paired
- Phone-only GitHub Actions release/build instructions

## Remaining
1. Confirmation flow for sensitive actions
2. Web-to-device status synchronization UI
3. Tests and CI build verification
4. Production persistence/rate limits for pairing and command queues
5. Release signing configuration (user-owned keystore)
6. Vercel production deployment configuration and production secrets

No component should bypass Android permissions or execute commands outside the allow-list.
