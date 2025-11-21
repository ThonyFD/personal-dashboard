# Gmail Poller Service

Servicio de respaldo que consulta Gmail periódicamente cuando las notificaciones push fallan.

## Arquitectura

```
Cloud Scheduler → Cloud Run (Poller) → Gmail API → Ingestor Service
     (cada hora)                        (consulta últimas 24h)
```

## Funcionalidad

- **Polling programado**: Se ejecuta cada hora via Cloud Scheduler
- **Consulta histórica**: Revisa emails de las últimas 24 horas
- **Deduplicación**: Evita procesar emails ya procesados por push notifications
- **Bajo costo**: Solo se ejecuta cuando es necesario

## Endpoints

- `GET /health` - Health check
- `POST /poll` - Trigger manual de polling (para testing)
- `POST /scheduled-poll` - Endpoint para Cloud Scheduler

## Despliegue

```bash
cd services/poller
npm install
npm run build
npm run deploy
```

## Configuración de Cloud Scheduler

Después del despliegue:

```bash
# Crear job que se ejecuta cada hora
gcloud scheduler jobs create http gmail-poller \
  --schedule="0 * * * *" \
  --http-method=POST \
  --uri="https://gmail-poller-XXXX.run.app/scheduled-poll" \
  --oidc-service-account-email="finance-agent-sa@mail-reader-433802.iam.gserviceaccount.com" \
  --location=us-central1 \
  --project=mail-reader-433802
```

## Costo

- **Cloud Run**: ~$0/mes (free tier)
- **Cloud Scheduler**: ~$0/mes (3 jobs gratis)
- **Gmail API**: ~$0 (dentro del límite gratuito)

## Monitoreo

```bash
# Ver logs del poller
gcloud logging read 'resource.labels.service_name=gmail-poller' --limit=10

# Ver ejecuciones del scheduler
gcloud scheduler jobs list --project=mail-reader-433802