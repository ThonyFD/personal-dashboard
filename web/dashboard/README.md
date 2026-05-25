# Dashboard

Aplicación React + TypeScript para visualizar transacciones, merchants, reportes y control mensual.

## Fuente de datos real

- consultas directas a Supabase desde el frontend
- push notifications con Firebase Cloud Messaging
- health checks contra el endpoint del ingestor

## Desarrollo

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Variables de entorno

Crea `.env.local` con:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_FIREBASE_PROJECT_ID=mail-reader-433802
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=mail-reader-433802.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=mail-reader-433802.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-web-push-vapid-key

VITE_INGESTOR_URL=https://your-ingestor.run.app
```

`VITE_FIREBASE_*` solo se usa para FCM; la capa de datos del dashboard es Supabase.

## Deployment

El deploy actual es a Firebase Hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Tech stack

- React 18
- TypeScript
- Vite
- TanStack Query
- React Router
- Supabase JS
- Firebase Cloud Messaging
- Recharts
- date-fns
