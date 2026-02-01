# Guía de Deployment: Notificaciones Push de Pagos Pendientes

## Resumen
Sistema completo de notificaciones push en el navegador que alerta 2 veces al día (9am y 6pm) sobre pagos pendientes de hoy + próximos 3 días.

**Arquitectura implementada:**
- ✅ Frontend: React + Firebase Messaging + Service Worker
- ✅ Backend: Cloud Run service "notifier"
- ✅ Database: Queries GraphQL agregadas
- ⏳ Deployment: Requiere pasos manuales (ver abajo)

---

## FASE 1: Obtener VAPID Key de Firebase

### 1.1 Configurar Firebase Cloud Messaging

1. **Ir a Firebase Console:**
   - URL: https://console.firebase.google.com/project/mail-reader-433802/settings/cloudmessaging

2. **En la pestaña "Cloud Messaging":**
   - Buscar sección "Web Push certificates"
   - Si NO existe un key pair, click en "Generate key pair"
   - Si YA existe, copiar la clave pública (empieza con "B...")

3. **Copiar la clave pública VAPID**
   - Ejemplo: `BKxGo7...` (será mucho más larga)

---

## FASE 2: Configurar Variables de Entorno

### 2.1 Frontend (.env.local)

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard

# Crear/editar .env.local y agregar:
echo "VITE_FIREBASE_VAPID_KEY=<TU_CLAVE_PUBLICA_VAPID>" >> .env.local
```

**⚠️ IMPORTANTE:** Reemplaza `<TU_CLAVE_PUBLICA_VAPID>` con la clave que copiaste de Firebase Console.

---

## FASE 3: Regenerar SDK de Firebase Data Connect

### 3.1 Actualizar Node.js (si es necesario)

El SDK requiere Node.js >=20.0.0. Verifica tu versión:

```bash
node --version
```

Si es < 20.0.0, actualiza Node:

```bash
# Con nvm (recomendado)
nvm install 20
nvm use 20

# O con Homebrew
brew install node@20
brew link node@20
```

### 3.2 Regenerar SDK

```bash
cd /Users/thonyfd/projects/personal-dashboard/dataconnect

# Regenerar SDK con las nuevas queries
FIREBASE_DATACONNECT_POSTGRES_STRING="confirm" firebase dataconnect:sdk:generate
```

**Resultado esperado:**
- SDK regenerado en `web/dashboard/src/generated/`
- SDK regenerado en `services/ingestor/src/generated/`
- Nuevas queries disponibles:
  - `GetAllActivePushSubscriptions`
  - `GetMaxPushSubscriptionId`

---

## FASE 4: Deploy Frontend

### 4.1 Build y Deploy

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard

# Instalar dependencias (si es necesario)
npm install

# Build
npm run build

# Deploy a Firebase Hosting
firebase deploy --only hosting
```

### 4.2 Verificación

1. Ir a https://personal-finantial-dashboard.web.app/monthly-control
2. Verificar que aparece el componente "🔔 Recordatorios de Pagos"
3. Verificar que los iconos placeholder están en `public/` (icon-192.png, badge-72.png)

**Nota:** Los iconos actualmente son placeholders SVG. Para producción, reemplázalos con imágenes PNG reales de 192x192px y 72x72px.

---

## FASE 5: Deploy Backend Service (Notifier)

### 5.1 Deploy Cloud Run Service

```bash
cd /Users/thonyfd/projects/personal-dashboard/services/notifier

# Instalar dependencias
npm install

# Deploy (construye imagen + despliega a Cloud Run)
export GOOGLE_CLOUD_PROJECT=mail-reader-433802
./deploy.sh
```

**El script hará:**
1. Construir imagen Docker con Google Cloud Build
2. Desplegar a Cloud Run con:
   - Nombre: `finance-agent-notifier`
   - Región: `us-central1`
   - Autenticación requerida (no público)
   - Min instances: 0, Max instances: 2
   - Memory: 512Mi, CPU: 1
   - Service account: `finance-agent-sa@mail-reader-433802.iam.gserviceaccount.com`

**Resultado esperado:**
- Servicio desplegado exitosamente
- URL del servicio impresa en consola
- Comandos para Cloud Scheduler impresos

### 5.2 Copiar Service URL

Guarda la URL del servicio que aparece en el output:
```
Service URL: https://finance-agent-notifier-xxxxxx-uc.a.run.app
```

---

## FASE 6: Configurar Cloud Scheduler

### 6.1 Crear Jobs de Notificación

**Reemplaza `<SERVICE_URL>` con la URL del paso 5.2**

**Job de la mañana (9am):**
```bash
gcloud scheduler jobs create http notifier-morning \
  --schedule='0 9 * * *' \
  --time-zone='America/Panama' \
  --uri='<SERVICE_URL>/notify' \
  --http-method=POST \
  --oidc-service-account-email='finance-agent-sa@mail-reader-433802.iam.gserviceaccount.com' \
  --location='us-central1' \
  --project='mail-reader-433802'
```

**Job de la tarde (6pm):**
```bash
gcloud scheduler jobs create http notifier-evening \
  --schedule='0 18 * * *' \
  --time-zone='America/Panama' \
  --uri='<SERVICE_URL>/notify' \
  --http-method=POST \
  --oidc-service-account-email='finance-agent-sa@mail-reader-433802.iam.gserviceaccount.com' \
  --location='us-central1' \
  --project='mail-reader-433802'
```

### 6.2 Otorgar Permisos

```bash
gcloud run services add-iam-policy-binding finance-agent-notifier \
  --member='serviceAccount:finance-agent-sa@mail-reader-433802.iam.gserviceaccount.com' \
  --role='roles/run.invoker' \
  --region=us-central1 \
  --project=mail-reader-433802
```

### 6.3 Verificar Jobs Creados

```bash
gcloud scheduler jobs list \
  --location=us-central1 \
  --project=mail-reader-433802 \
  --format="table(name,schedule,state,timeZone)"
```

**Resultado esperado:**
```
NAME               SCHEDULE     STATE    TIME_ZONE
notifier-morning   0 9 * * *    ENABLED  America/Panama
notifier-evening   0 18 * * *   ENABLED  America/Panama
```

---

## FASE 7: Testing End-to-End

### 7.1 Test Frontend (Local)

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard
npm run dev
```

1. **Abrir:** http://localhost:3000/monthly-control
2. **Verificar componente NotificationSettings aparece**
3. **Click "Activar Notificaciones"**
4. **Aceptar permiso del navegador**
5. **Verificar en consola:** FCM token obtenido
6. **Verificar en DB:** Registro creado en tabla `push_subscriptions`

**Query para verificar en DB:**
```sql
SELECT * FROM push_subscriptions WHERE is_active = true;
```

### 7.2 Test Backend Service

**Health check:**
```bash
curl https://finance-agent-notifier-xxxxxx-uc.a.run.app/health
```

**Resultado esperado:**
```json
{"status":"healthy"}
```

### 7.3 Test Notificación Manual

**Prerequisitos:**
1. Frontend desplegado y suscripción activa
2. Crear una transacción manual pendiente para mañana:
   - Ir a MonthlyControl en producción
   - Agregar transacción manual: `is_paid=false`, `day=mañana`

**Trigger manual del job:**
```bash
gcloud scheduler jobs run notifier-morning \
  --location=us-central1 \
  --project=mail-reader-433802
```

**Ver logs:**
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=finance-agent-notifier" \
  --limit=20 \
  --project=mail-reader-433802 \
  --format=json
```

**Resultado esperado:**
- Log: "Starting payment reminders job"
- Log: "Found X active subscriptions"
- Log: "Notification sent successfully"
- **Notificación recibida en el navegador**

---

## FASE 8: Verificación de Producción

### 8.1 Checklist de Funcionalidad

- [ ] Frontend desplegado en Firebase Hosting
- [ ] Componente NotificationSettings visible en /monthly-control
- [ ] Botón "Activar Notificaciones" funciona
- [ ] Permiso del navegador solicitado correctamente
- [ ] Suscripción guardada en database
- [ ] Backend service desplegado en Cloud Run
- [ ] Health check responde 200 OK
- [ ] Cloud Scheduler jobs creados (morning y evening)
- [ ] Service account tiene permisos de invoker
- [ ] Notificación manual funciona (test con `gcloud scheduler jobs run`)
- [ ] Logs estructurados visibles en Cloud Logging

### 8.2 Monitoreo

**Ver todas las suscripciones activas:**
```bash
gcloud sql connect personal-dashboard-fdc --user=postgres --database=fdcdb_dc --quiet
```

```sql
SELECT user_email, is_active, created_at
FROM push_subscriptions
WHERE is_active = true
ORDER BY created_at DESC;
```

**Ver próximas ejecuciones de scheduler:**
```bash
gcloud scheduler jobs describe notifier-morning \
  --location=us-central1 \
  --project=mail-reader-433802 \
  --format="table(name,schedule,state,status.lastAttemptTime)"
```

---

## Troubleshooting

### Problema: No recibo notificaciones

**Diagnóstico:**

1. **Verificar suscripción activa:**
   ```sql
   SELECT * FROM push_subscriptions WHERE is_active = true;
   ```
   Si no hay resultados, activar notificaciones en el dashboard.

2. **Verificar permisos del navegador:**
   - En Chrome: Settings → Privacy and security → Site settings → Notifications
   - Verificar que el sitio tenga permisos concedidos

3. **Verificar logs del servicio:**
   ```bash
   gcloud logging tail \
     "resource.type=cloud_run_revision AND resource.labels.service_name=finance-agent-notifier" \
     --project=mail-reader-433802
   ```

4. **Verificar token FCM válido:**
   - Desactivar y reactivar notificaciones en el dashboard
   - Esto generará un nuevo token

### Problema: Service worker no se registra

**Solución:**

1. **Verificar archivo existe:**
   ```bash
   ls /Users/thonyfd/projects/personal-dashboard/web/dashboard/public/firebase-messaging-sw.js
   ```

2. **Verificar build incluye service worker:**
   ```bash
   ls /Users/thonyfd/projects/personal-dashboard/web/dashboard/dist/firebase-messaging-sw.js
   ```

3. **Limpiar caché del navegador:**
   - Chrome DevTools → Application → Service Workers → Unregister
   - Recargar página

### Problema: Cloud Scheduler no ejecuta el job

**Diagnóstico:**

1. **Verificar estado del job:**
   ```bash
   gcloud scheduler jobs describe notifier-morning \
     --location=us-central1 \
     --project=mail-reader-433802
   ```

2. **Verificar permisos:**
   ```bash
   gcloud run services get-iam-policy finance-agent-notifier \
     --region=us-central1 \
     --project=mail-reader-433802
   ```
   Debe incluir: `serviceAccount:finance-agent-sa@...` con rol `roles/run.invoker`

3. **Ver logs del scheduler:**
   ```bash
   gcloud logging read \
     "resource.type=cloud_scheduler_job" \
     --limit=10 \
     --project=mail-reader-433802
   ```

---

## Costos Estimados

**Costos mensuales:**
- Cloud Run (notifier): $0 (free tier, ~60 invocaciones/mes)
- Cloud Scheduler: $0.10/job × 2 = **$0.20/mes**
- Firebase Cloud Messaging: $0 (bajo 1M mensajes)
- Firebase Hosting: $0 (free tier)

**Total: ~$0.20/mes**

---

## Siguiente Pasos (Opcional)

### Mejorar Iconos

Reemplazar placeholders SVG con PNG reales:

1. Crear ícono 192x192px: `web/dashboard/public/icon-192.png`
2. Crear badge 72x72px: `web/dashboard/public/badge-72.png`
3. Rebuild y redeploy frontend

Herramientas sugeridas:
- [Figma](https://figma.com)
- [Canva](https://canva.com)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Agregar Preferencias de Usuario

Actualmente todos los usuarios reciben notificaciones a las 9am y 6pm. Para permitir personalización:

1. Agregar UI en NotificationSettings para configurar horarios
2. Usar tabla `notification_preferences` en database
3. Modificar servicio notifier para filtrar por preferencias

### Notificaciones Más Ricas

Mejorar contenido de notificaciones:

1. Mostrar top 3 pagos más grandes
2. Agrupar por método de pago
3. Agregar botón "Marcar como pagado" en la notificación

---

## Archivos Creados/Modificados

### Frontend (10 archivos):
- ✅ `web/dashboard/public/firebase-messaging-sw.js` - Service worker
- ✅ `web/dashboard/public/icon-192.png` - Ícono placeholder
- ✅ `web/dashboard/public/badge-72.png` - Badge placeholder
- ✅ `web/dashboard/public/README.md` - Documentación de assets
- ✅ `web/dashboard/src/lib/firebase.ts` - Modificado (Firebase Messaging)
- ✅ `web/dashboard/src/hooks/usePushNotifications.ts` - Hook custom
- ✅ `web/dashboard/src/components/NotificationSettings.tsx` - Componente UI
- ✅ `web/dashboard/src/components/NotificationSettings.css` - Estilos
- ✅ `web/dashboard/src/pages/MonthlyControl.tsx` - Modificado (integración)
- ✅ `web/dashboard/src/api/dataconnect-client.ts` - Modificado (funciones push)

### Backend (8 archivos):
- ✅ `dataconnect/connector/queries.gql` - Modificado (nuevas queries)
- ✅ `services/notifier/package.json` - Dependencias
- ✅ `services/notifier/tsconfig.json` - Config TypeScript
- ✅ `services/notifier/src/index.ts` - Servicio principal
- ✅ `services/notifier/Dockerfile` - Imagen Docker
- ✅ `services/notifier/deploy.sh` - Script deployment
- ✅ `services/notifier/.gitignore` - Git ignore

### Documentación:
- ✅ `NOTIFICACIONES_DEPLOYMENT.md` - Esta guía

---

## Soporte

Para problemas o preguntas:
1. Revisar logs en Cloud Logging
2. Verificar checklist en sección 8.1
3. Consultar sección Troubleshooting

**Estado del proyecto:** ✅ Implementación completa, listo para deployment
