# Sentinel AI — Device Pairing Protocol

## Goal
Establish a user-authorized link between the Android agent and the web control panel without putting long-lived secrets in source code.

## Implemented pairing flow
1. The authenticated web control center calls `POST /pairing/start` with the production control secret.
2. The server creates a cryptographically random 6-digit code valid for 5 minutes and single use.
3. The user enters that code in the Android companion.
4. Android calls `POST /pairing/claim` over HTTPS with the code and a stable device ID.
5. The server validates the one-time code and returns a device-scoped JWT valid for 30 days.
6. Android stores the JWT only in Android Keystore-backed encrypted storage.
7. Android uses the bearer credential for heartbeat and command-channel requests.

## Authenticated channel
- `POST /devices/:deviceId/heartbeat` updates online/last-seen state.
- `GET /channel/next` returns at most one queued command for the authenticated device.
- `POST /channel/ack` acknowledges command handling.
- Web control commands are accepted only with the production control secret and are bound to an already-paired device.
- Commands are restricted to the server allow-list.

## Request validation
Every device request must be authenticated, bound to the registered device, timestamped by the server-side record where applicable, and rejected when expired or malformed. The server never trusts a device-provided identity without validating its credential.

## Safety boundary
The command layer uses an explicit allow-list of supported actions. Unknown actions are rejected. Sensitive actions require an explicit confirmation in the Android app. The service must not bypass Android permissions or execute arbitrary shell commands.

## Secrets
- `JWT_SECRET` and `CONTROL_PANEL_SECRET` are production deployment secrets and must never be committed.
- No signing keystore or private key belongs in Git.
- Pairing credentials are device-scoped and revocable by clearing the device credential; persistent revocation UI is a remaining task.

## Remaining implementation pieces
- Android background channel service and command execution integration
- Sensitive-action confirmation flow
- Web status synchronization UI
- Automated tests for expiry, replay, invalid credentials, and unknown actions
- Persistent production storage/rate limits
