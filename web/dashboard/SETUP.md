# Dashboard Setup

Guía mínima para correr el dashboard localmente con el stack actual.

## Requisitos

- Node.js 20+
- proyecto Supabase con `anon key`
- web app de Firebase configurada para Cloud Messaging
- URL pública del ingestor para la pantalla de salud

## Variables de entorno

Crea `web/dashboard/.env.local`:

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

## Obtener las credenciales

### Supabase

Usa la URL del proyecto y la `anon key` desde Settings -> API.

### Firebase Cloud Messaging

1. Ve a Firebase Console -> Project settings -> Your apps.
2. Copia los valores de la web app.
3. En Cloud Messaging, genera o copia la Web Push certificate key para `VITE_FIREBASE_VAPID_KEY`.

## Ejecutar

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Qué valida esta app

- datos desde Supabase
- suscripción a push notifications con FCM
- health y metrics del ingestor vía `VITE_INGESTOR_URL`

## Problemas comunes

### No cargan transacciones

- revisa `VITE_SUPABASE_URL`
- revisa `VITE_SUPABASE_ANON_KEY`
- confirma que existan filas en `transactions`

### Fallan las notificaciones push

- revisa todas las variables `VITE_FIREBASE_*`
- confirma que el navegador permita notificaciones
- revisa que `VITE_FIREBASE_VAPID_KEY` sea la web push key correcta

### System Health falla

- revisa `VITE_INGESTOR_URL`
- confirma que el ingestor responda `GET /monitoring/health`
