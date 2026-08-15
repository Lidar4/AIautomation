# Build and install the Android app from a phone

You do not need a PC for the normal project build: GitHub Actions can build the APK in the cloud.

1. Open the repository on GitHub.
2. Open **Actions**.
3. Select **Sentinel AI Android Release**.
4. Tap **Run workflow**.
5. If release secrets are configured, wait for the workflow to finish.
6. Open the completed workflow run and download the `sentinel-ai-release-apk` artifact.
7. Extract the APK from the downloaded artifact and install it on the Android phone.
8. Android may ask you to allow installation from the browser/file manager used to open the APK. Only enable that permission for the app you trust, then install.
9. Open Sentinel AI and complete the pairing flow shown by the web control panel.

If the release workflow fails because signing secrets are missing, do not paste passwords into chat. Add the four signing secrets under GitHub **Settings → Secrets and variables → Actions** as documented in `RELEASE.md`.
