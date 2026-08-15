# Sentinel AI — what the owner needs to do now

## 1. Production backend
Set these environment variables on the backend host:
- `JWT_SECRET`: a long random secret
- `CONTROL_PANEL_SECRET`: a separate long random secret

## 2. Vercel web app
Set:
- `SENTINEL_BACKEND_URL`: the HTTPS URL of the production Sentinel backend

Redeploy the Vercel project after saving the variable.

## 3. Android release signing
In GitHub → Settings → Secrets and variables → Actions, add:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit the keystore or secret values.

## 4. Pair the phone
Open the web control center, enter the control-panel secret in the pairing dialog, generate a six-digit code, then enter that code in the Android companion app together with the production HTTPS server URL.

## 5. Android permissions
The owner must explicitly enable Android permissions such as notifications and Accessibility only when needed. The agent cannot grant these permissions to itself.
