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
