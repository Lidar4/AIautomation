# Sentinel AI Web Control Center

The web UI is a control center, not a direct bypass into the device. Device actions require an authenticated companion and Android permissions.

## Why a top link/button may appear not to work
The UI can render navigation controls before the corresponding backend route exists. A link is only functional when its target route and deployment are configured. The current build is being wired to the backend/device channel; until deployment and routes are connected, some controls are intentionally non-operative.
