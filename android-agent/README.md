# Sentinel AI — Android Companion

This is the production Android companion for Sentinel AI. It is designed around explicit user consent and Android's supported APIs.

## What it does
- Receives authenticated commands from the Sentinel AI control plane.
- Executes only allow-listed actions that the user has enabled.
- Uses Android AccessibilityService only after the user explicitly enables it in Android Settings.
- Provides a visible stop/disable control.
- Never attempts to bypass Android permissions, device security, lock screens, or app sandboxing.

## Build
Open this directory as an Android Studio project after the Gradle wrapper/project files are added. Build the debug APK with Android Studio's **Build > Build APK(s)**.

## Permissions
Permissions are intentionally requested only when a feature needs them. Accessibility access is user-controlled in Android Settings.
