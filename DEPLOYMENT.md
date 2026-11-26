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

## Canonical portal address

Use https://portal.bilad.org.tr. Legacy production Vercel aliases redirect to this address. Device-transfer recovery is retired; its route redirects to QR scan.

After the approved one-time device binding reset, each user must scan from their own phone and account. The first successful QR scan binds that browser. Account data and attendance history are preserved. Do not run the reset on subsequent deployments.
