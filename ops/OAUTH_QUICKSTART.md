# OAuth Token Monitoring - Inicio Rápido

## Problema que Resuelve

El refresh token de Gmail puede expirar después de 6 meses sin uso o por cambios de contraseña. Este sistema te alerta automáticamente cuando eso pasa, para que lo renueves antes de perder datos.

---

## Instalación (2 minutos)

### 1. Desplegar el Servicio Actualizado

```bash
cd services/ingestor

~/google-cloud-sdk/bin/gcloud run deploy ingestor \
  --source . \
  --region=us-central1 \
  --project=mail-reader-433802 \
  --allow-unauthenticated
```

### 2. Configurar Monitoreo

```bash
cd ops

# Opcionalmente cambia el email
export NOTIFICATION_EMAIL="tu-email@gmail.com"

./setup-oauth-monitoring.sh
```

✅ **Listo!** El sistema ahora monitorea tu token cada 6 horas.

---

## Cómo Funciona

1. **Cloud Scheduler** ejecuta health check cada 6 horas
2. **Health Check** intenta refrescar el access token
3. Si falla → **Alert enviada a tu email** 📧
4. **Tú renuevas el token** siguiendo [esta guía](../infra/gcloud/refresh-gmail-token.md) (~5 min)

---

## Verificar que Funciona

```bash
# Ver estado del scheduler
~/google-cloud-sdk/bin/gcloud scheduler jobs describe oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802

# Ver últimos health checks
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event=~"oauth_health_check"' \
  --limit=5 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,jsonPayload.event)"

# Forzar un health check ahora (para probar)
~/google-cloud-sdk/bin/gcloud scheduler jobs run oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802
```

---

## Si Recibes una Alerta

**Email que recibirás:**
```
⚠️ Alert: oauth-token-failure-alert

OAuth refresh token has expired or is invalid.
Manual re-authorization required.
```

**Qué hacer:**

1. Sigue las instrucciones en [infra/gcloud/refresh-gmail-token.md](../infra/gcloud/refresh-gmail-token.md)
2. Genera un nuevo refresh token (5 minutos)
3. Actualízalo en Secret Manager
4. El sistema se recupera automáticamente ✅

---

## Costos

**$0/mes** - Todo dentro del free tier de Google Cloud:
- Cloud Scheduler: 3 jobs gratis (usamos 1)
- Cloud Run: 2M requests gratis (usamos ~120/mes)
- Cloud Monitoring: 100 metrics gratis (usamos 1)
- Emails: Incluidos

---

## Documentación Completa

- [OAUTH_MONITORING.md](./OAUTH_MONITORING.md) - Guía completa del sistema
- [refresh-gmail-token.md](../infra/gcloud/refresh-gmail-token.md) - Cómo renovar el token

---

## Comandos Rápidos

```bash
# Ver estado del token ahora
SERVICE_URL=$(~/google-cloud-sdk/bin/gcloud run services describe ingestor \
  --region=us-central1 \
  --project=mail-reader-433802 \
  --format="value(status.url)")
curl "$SERVICE_URL/health/oauth"

# Ver logs de health checks
~/google-cloud-sdk/bin/gcloud logging read \
  'jsonPayload.event=~"oauth_health_check"' \
  --limit=10 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,jsonPayload.event)"

# Trigger manual del health check
~/google-cloud-sdk/bin/gcloud scheduler jobs run oauth-token-health-check \
  --location=us-central1 \
  --project=mail-reader-433802
```

---

¿Tienes problemas? Consulta [OAUTH_MONITORING.md](./OAUTH_MONITORING.md) para troubleshooting detallado.
