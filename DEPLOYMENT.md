# Bilad Portal Frontend Deploy Notes

## Vercel

Framework preset: Next.js

Build command:

```bash
npm run build
```

Install command:

```bash
npm install
```

## Environment variables

```env
NEXT_PUBLIC_API_URL=https://<railway-backend-domain>
NEXT_PUBLIC_FRONTEND_URL=https://<vercel-frontend-domain>
```

After changing either value in Vercel, redeploy the frontend.

## Backend CORS

The Railway backend must include the frontend origin:

```env
BACKEND_CORS_ORIGINS=https://<vercel-frontend-domain>
```

## Smoke checks

- Login works from the Vercel URL.
- Profile photo loads from the Railway `/uploads/...` URL.
- QR scan opens the camera on iPhone/Android over HTTPS.
- Attendance, leaves, notifications, and Excel export call the Railway API without CORS errors.

## Device identity after the custom-domain migration

Device IDs in localStorage belong to an origin. Moving from
`https://bilad-portal-web.vercel.app` to `https://portal.bilad.org.tr` does not
move the browser's existing device ID automatically.

Both scan pages now attempt a one-time recovery when the API rejects a device
binding. Keep `/device-transfer` accessible on **both** production domains;
do not redirect the old domain away before its page can read localStorage.
The transfer visits the old origin as a top-level page, then returns to the
fixed new origin with a short-lived, single-use state checked in sessionStorage.
Device IDs travel only in URL fragments, which are cleared immediately. No login
token is transferred, no account binding is reset, and the API continues checking
the device ID against the authenticated user. The user scans a fresh QR afterward.

If the old browser storage was deleted, or the user changed browsers/PWA storage
contexts, automatic recovery cannot establish the original device identity.
After verifying the user, a super admin can use the existing individual device
reset in Users. Do not reset all users or return stored device IDs via a login API.
Manual retry: open `https://portal.bilad.org.tr/device-transfer` in the original
browser and choose the transfer button.

Regression tests (Node 24): `node --test tests/device-migration.test.mjs`.
