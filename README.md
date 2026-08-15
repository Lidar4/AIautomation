# Sentinel AI — Android Control Platform

Sentinel AI is a security-first web control center plus Android companion for managing **explicitly approved device actions**. The project is designed around authenticated pairing, server-side authorization, Android Keystore-backed credentials, heartbeat/status reporting, and an allow-listed command model.

> This project is not an unrestricted remote-shell or arbitrary phone-control system. Commands must be explicitly supported by the app's policy and permissions.

## Current architecture

- **Web Control Center** — responsive professional dashboard for device status, pairing, approved commands, and activity.
- **Backend channel** — authenticated pairing/session handling and server-side request validation.
- **Android companion** — authenticated channel/heartbeat, secure credential storage, and permission-controlled action handlers.
- **Production build** — GitHub Actions workflow for a release APK using owner-provided signing secrets.

## Security model

- One-time pairing codes expire quickly and are device-specific.
- Android credentials are stored using Android Keystore-backed storage.
- Production secrets stay in hosting/GitHub secret storage; never commit them to source control.
- The server validates authenticated requests and applies an allow-list/policy before an action is dispatched.
- The Android app only performs actions for which the user has granted the required Android permission.

## Android build from a phone

You can build the release APK using GitHub Actions without a PC:

1. Open **Actions** in this repository.
2. Select **Sentinel AI Android Release**.
3. Choose **Run workflow**.
4. After a successful run, download the `sentinel-ai-release-apk` artifact.
5. Extract the APK and install it on your Android phone.

See [`android-agent/BUILD_AND_INSTALL.md`](android-agent/BUILD_AND_INSTALL.md) and [`android-agent/RELEASE.md`](android-agent/RELEASE.md) for the exact release setup.

## Production secrets

Do not paste secrets into chat or commit them to the repository. The release workflow expects the owner to configure signing secrets in GitHub Actions. Production backend secrets such as `JWT_SECRET` and `CONTROL_PANEL_SECRET` belong in the production hosting provider's environment variables.

## Development

The web app uses React/TypeScript/Vite. The Android companion is a Gradle Android application. Use the repository's existing package scripts and Android Gradle project for local development.

## Project status

See [`BUILD_STATUS.md`](BUILD_STATUS.md) for the current implementation checklist and remaining production work.
