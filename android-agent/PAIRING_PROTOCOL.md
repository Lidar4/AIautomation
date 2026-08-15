# Sentinel AI — Device Pairing Protocol

## Goal
Establish a user-authorized link between the Android agent and the web control panel without putting long-lived secrets in source code.

## Pairing flow
1. The web panel creates a short-lived pairing session on the server.
2. The server returns a one-time pairing code/token with a short expiry.
3. The user enters or confirms that code inside the Android app.
4. The Android app exchanges the one-time code over HTTPS.
5. The server validates the code, creates a device record, and returns a device-scoped credential.
6. The Android app stores the credential only in Android Keystore-backed storage.
7. The app reports a minimal online/last-seen heartbeat; no unrestricted command channel is created.

## Request validation
Every device request must be authenticated, bound to the registered device, timestamped, and rejected when expired or malformed. The server must never trust a device-provided user/device identity without validating its credential.

## Safety boundary
The command layer must use an explicit allow-list of supported actions. Unknown actions are rejected. Sensitive actions require an explicit confirmation in the Android app. The service must not bypass Android permissions or execute arbitrary shell commands.

## Secrets
- No production server secret belongs in the Android source tree.
- No signing keystore or private key belongs in Git.
- Production secrets should be configured through the deployment/CI secret store.
- Pairing credentials should be revocable from the web panel.

## Next implementation pieces
- Server pairing endpoint and request schema
- Android pairing screen/client
- Keystore-backed credential storage
- Device heartbeat/status endpoint
- Allow-list command request/response model
- Automated tests for expiry, replay, invalid credentials, and unknown actions
