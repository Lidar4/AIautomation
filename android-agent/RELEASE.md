# Android release configuration

## Signing
For a real release APK, create and keep a keystore outside the repository. Never commit the keystore or passwords.

In GitHub: Settings → Secrets and variables → Actions, add repository secrets such as `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` only when the release workflow is ready to consume them.

## Server secret
Set `JWT_SECRET` in the production backend hosting provider's environment variables. Do not put it in source code.

The current workflow builds a debug APK for verification. Release signing should be enabled only after the owner supplies their own private keystore/secrets.
