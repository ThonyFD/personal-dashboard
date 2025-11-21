# Sistema de Monitoreo OAuth - Guía Completa

## Resumen

Este sistema monitorea la salud del refresh token de OAuth para Gmail y te alerta automáticamente cuando necesita ser renovado.

**Costo:** $0/mes (100% free tier)

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────┐
│  Cloud Scheduler (cada 6 horas)         │
│  Ejecuta: GET /health/oauth             │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  Cloud Run: ingestor                    │
│  Endpoint: /health/oauth                │
│  • Intenta refrescar access token       │
│  • Registra resultado en logs           │
│  • Retorna 200 (OK) o 503 (FAIL)       │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  Cloud Logging                          │
│  Eventos:                               │
│  • oauth_health_check_success ✅        │
│  • oauth_health_check_failed ❌         │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  Log-based Metric                       │
│  Cuenta eventos "oauth_health_check_    │
│  failed"                                │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  Alert Policy                           │
│  Condición: failures > 0 en 5 minutos  │
│  Acción: Enviar email                   │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  📧 Email Notification                  │
│  "⚠️ OAuth token expiró"                │
│  + Link a documentación                 │
└─────────────────────────────────────────┘
```

---

## Instalación

### 1. Desplegar el Código Actualizado

El servicio ingestor ya tiene el endpoint `/health/oauth`. Despliégalo:

```bash
cd services/ingestor

# Build y deploy
~/google-cloud-sdk/bin/gcloud run deploy ingestor \
  --source . \
  --region=us-central1 \
  --project=mail-reader-433802 \
  --allow-unauthenticated
```

### 2. Configurar Monitoreo y Alertas

Ejecuta el script de setup:

```bash
cd ops

# Opcionalmente, especifica tu email
export NOTIFICATION_EMAIL="tu-email@gmail.com"

# Ejecutar setup
./setup-oauth-monitoring.sh
```

Este script configura automáticamente:
- ✅ Cloud Scheduler job (cada 6 horas)
- ✅ Log-based metric (cuenta failures)
- ✅ Alert policy (trigger en failures)
- ✅ Email notification channel

**Total tiempo:** ~2 minutos

---

## Verificación

### Verificar que el Endpoint Funciona

```bash
# Obtener URL del servicio
SERVICE_URL=$(~/google-cloud-sdk/bin/gcloud run services describe ingestor \
  --region=us-central1 \
  --project=mail-reader-433802 \
  --format="value(status.url)")

# Probar el endpoint
curl "$SERVICE_URL/health/oauth"
```

**Respuesta esperada (token válido):**
```json
{
  "status": "healthy",
  "tokenExpiresIn": 3599,
  "message": "OAuth token is valid and can be refreshed"
}
```

**Respuesta si token expiró:**
```json
{
  "status": "unhealthy",
  "error": "OAuth token refresh failed: 400 invalid_grant",
  "needsManualIntervention": true,
  "message": "Refresh token is invalid. Manual re-authorization required."
}
```

### Verificar Cloud Scheduler

```bash
# Ver configuración del job
~/google-cloud-sdk/bin/gcloud scheduler jobs describe oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Trigger manual (para probar)
~/google-cloud-sdk/bin/gcloud scheduler jobs run oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802
```

### Verificar Logs

```bash
# Ver últimos health checks
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event=~"oauth_health_check"' \
  --limit=10 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),jsonPayload.event,jsonPayload.tokenExpiresIn,jsonPayload.error)"

# Ver solo failures
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event="oauth_health_check_failed"' \
  --limit=5 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,jsonPayload.error)"
```

### Verificar Alert Policy

```bash
# Listar alert policies
~/google-cloud-sdk/bin/gcloud alpha monitoring policies list \
  --project=mail-reader-433802 \
  --filter="displayName:oauth-token-failure-alert"

# Ver estado del metric
~/google-cloud-sdk/bin/gcloud logging metrics describe oauth_health_check_failed \
  --project=mail-reader-433802
```

---

## Qué Pasa Cuando el Token Expira

### 1. Detección Automática

Dentro de **6 horas** (siguiente ejecución del scheduler):
- Cloud Scheduler ejecuta `GET /health/oauth`
- El endpoint intenta refrescar el access token
- Detecta error `invalid_grant`
- Registra evento `oauth_health_check_failed` en logs

### 2. Alerta Enviada

Dentro de **5 minutos** del error:
- Cloud Monitoring detecta el evento de failure
- Se trigger la alert policy
- Recibes un email en tu inbox

**Asunto del email:**
```
Alert: oauth-token-failure-alert
```

**Contenido:**
```
OAuth refresh token has expired or is invalid.
Manual re-authorization is required.

Follow the instructions in: infra/gcloud/refresh-gmail-token.md
```

### 3. Renovación Manual

Sigue las instrucciones en [refresh-gmail-token.md](../infra/gcloud/refresh-gmail-token.md):

1. Ve a OAuth 2.0 Playground
2. Genera un nuevo refresh token
3. Actualízalo en Secret Manager
4. El sistema se recupera automáticamente

**Tiempo total para renovar:** ~5 minutos

---

## Frecuencia de Monitoreo

| Componente | Frecuencia | Razón |
|------------|------------|-------|
| Cloud Scheduler | Cada 6 horas | Balance entre detección rápida y costos |
| Alert Check | Cada 5 minutos | Cloud Monitoring default |
| Email Notification | Inmediato | Al detectar failure |

**Tiempo máximo de detección:** 6 horas + 5 minutos = ~6 horas

Esto es aceptable porque:
- El refresh token no expira instantáneamente
- Usualmente tienes días/semanas de aviso
- El costo de monitoreo más frecuente no vale la pena

---

## Costos (Free Tier)

| Servicio | Uso Mensual | Costo Free Tier | Costo Real |
|----------|-------------|-----------------|------------|
| Cloud Scheduler | 120 ejecuciones/mes (cada 6h) | 3 jobs gratis | $0 |
| Cloud Run (health check) | 120 requests/mes | 2M requests gratis | $0 |
| Cloud Logging | ~360 log entries/mes | 50 GB gratis | $0 |
| Cloud Monitoring | 1 metric + 1 alert | 100 metrics gratis | $0 |
| Email notifications | ~1-2/año (solo si falla) | Incluido | $0 |
| **TOTAL** | | | **$0/mes** |

---

## Comandos Útiles

### Monitoreo

```bash
# Ver próxima ejecución del scheduler
~/google-cloud-sdk/bin/gcloud scheduler jobs describe oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802 \
  --format="value(state,scheduleTime)"

# Ver historial de ejecuciones (últimas 24h)
~/google-cloud-sdk/bin/gcloud logging read \
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="oauth-token-health-check"' \
  --limit=20 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,textPayload)"

# Ver estado actual del token
curl "$SERVICE_URL/health/oauth" | jq
```

### Debugging

```bash
# Forzar un health check ahora
~/google-cloud-sdk/bin/gcloud scheduler jobs run oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Ver los logs en tiempo real
~/google-cloud-sdk/bin/gcloud logging tail \
  'jsonPayload.event=~"oauth_health_check"' \
  --project=mail-reader-433802

# Ver detalles de un failure específico
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event="oauth_health_check_failed"' \
  --limit=1 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,jsonPayload.error)" | head -1
```

### Modificar Configuración

```bash
# Cambiar frecuencia a cada 3 horas
~/google-cloud-sdk/bin/gcloud scheduler jobs update http oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802 \
  --schedule="0 */3 * * *"

# Pausar el monitoring temporalmente
~/google-cloud-sdk/bin/gcloud scheduler jobs pause oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Reactivar
~/google-cloud-sdk/bin/gcloud scheduler jobs resume oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Cambiar email de notificaciones
# (Requiere actualizar el notification channel manualmente en Cloud Console)
```

---

## Solución de Problemas

### Problema: No recibo emails de alerta

**Diagnóstico:**
```bash
# 1. Verificar que hay failures en logs
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event="oauth_health_check_failed"' \
  --limit=1 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,jsonPayload.error)"

# 2. Verificar que el metric está recibiendo datos
~/google-cloud-sdk/bin/gcloud logging metrics describe oauth_health_check_failed \
  --project=mail-reader-433802

# 3. Verificar notification channels
~/google-cloud-sdk/bin/gcloud alpha monitoring channels list \
  --project=mail-reader-433802

# 4. Verificar alert policy está enabled
~/google-cloud-sdk/bin/gcloud alpha monitoring policies list \
  --project=mail-reader-433802 \
  --filter="displayName:oauth-token-failure-alert"
```

**Solución:**
- Verifica que tu email en notification channel es correcto
- Verifica que la alert policy está enabled
- Revisa tu carpeta de spam

### Problema: Health check falla pero el token es válido

**Posible causa:** Problema temporal de red o Google API

**Diagnóstico:**
```bash
# Ver el error específico
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event="oauth_health_check_failed"' \
  --limit=1 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),jsonPayload.error)"
```

**Solución:**
- Si el error es `invalid_grant`: Token realmente expiró, necesita renovación
- Si el error es otro (timeout, network, etc.): Temporal, se recuperará solo
- El sistema solo alerta si el error persiste por 5+ minutos

### Problema: Scheduler job no se ejecuta

**Diagnóstico:**
```bash
# Ver estado del job
~/google-cloud-sdk/bin/gcloud scheduler jobs describe oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802 \
  --format="value(state)"

# Debe decir "ENABLED"
```

**Solución:**
```bash
# Si está PAUSED, resumir
~/google-cloud-sdk/bin/gcloud scheduler jobs resume oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Si no existe, ejecutar setup de nuevo
./ops/setup-oauth-monitoring.sh
```

---

## Mantenimiento

### Actualizar el Sistema

Cuando actualices el código del ingestor:

```bash
# 1. Deploy código actualizado
cd services/ingestor
~/google-cloud-sdk/bin/gcloud run deploy ingestor \
  --source . \
  --region=us-central1 \
  --project=mail-reader-433802

# 2. Verificar que el endpoint sigue funcionando
SERVICE_URL=$(~/google-cloud-sdk/bin/gcloud run services describe ingestor \
  --region=us-central1 \
  --project=mail-reader-433802 \
  --format="value(status.url)")

curl "$SERVICE_URL/health/oauth"

# 3. El scheduler automáticamente usa la nueva versión
```

### Eliminar el Monitoring

Si ya no lo necesitas:

```bash
# 1. Eliminar scheduler job
~/google-cloud-sdk/bin/gcloud scheduler jobs delete oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# 2. Eliminar alert policy
~/google-cloud-sdk/bin/gcloud alpha monitoring policies delete \
  $(~/google-cloud-sdk/bin/gcloud alpha monitoring policies list \
    --project=mail-reader-433802 \
    --filter="displayName:oauth-token-failure-alert" \
    --format="value(name)") \
  --project=mail-reader-433802

# 3. Eliminar metric
~/google-cloud-sdk/bin/gcloud logging metrics delete oauth_health_check_failed \
  --project=mail-reader-433802
```

---

## Preguntas Frecuentes

**P: ¿Cada cuánto debo renovar el refresh token?**

R: Solo cuando recibas la alerta. Si usas el sistema regularmente (recibes emails), el token puede durar años.

**P: ¿Puedo aumentar la frecuencia de monitoreo?**

R: Sí, pero no es necesario. Cambiar de 6 horas a 1 hora no te da mucho beneficio y puede acercarte al límite del free tier.

**P: ¿Qué pasa si el token expira durante la noche?**

R: El próximo health check lo detecta y te envía un email. Los emails bancarios se quedan en tu inbox y se procesarán cuando renueves el token.

**P: ¿Puedo recibir alertas por Slack/SMS en vez de email?**

R: Sí, pero Slack/SMS pueden tener costos. Para mantener free tier, email es la mejor opción.

**P: ¿El monitoring afecta el procesamiento normal de emails?**

R: No. El health check es independiente del flujo normal de emails via Pub/Sub.

---

## Referencias

- [refresh-gmail-token.md](../infra/gcloud/refresh-gmail-token.md) - Cómo renovar el token manualmente
- [oauth-manager.ts](../services/ingestor/src/utils/oauth-manager.ts) - Implementación del token manager
- Cloud Monitoring: https://console.cloud.google.com/monitoring?project=mail-reader-433802
- Cloud Scheduler: https://console.cloud.google.com/cloudscheduler?project=mail-reader-433802

---

**Última actualización:** 2025-11-02
