# Personal Dashboard

Sistema que monitorea Gmail para extraer transacciones financieras, las persiste en Supabase y las expone en un dashboard React con recordatorios push.

**Status:** producción  
**Proyecto GCP:** `mail-reader-433802`  
**Zona horaria:** `America/Panama`

## Arquitectura

```text
Gmail push -> Pub/Sub -> Cloud Run ingestor -> Supabase
                    \-> GitHub Actions (renew watch, sync defensivo, reminders)
Dashboard React -> Supabase + Firebase Cloud Messaging
```

### Flujos activos

1. Gmail envía notificaciones push a Pub/Sub.
2. `services/ingestor` procesa el correo y guarda emails/transacciones en Supabase.
3. GitHub Actions renueva el watch de Gmail diariamente.
4. GitHub Actions corre un sync defensivo y envía recordatorios por FCM.
5. El dashboard consulta Supabase directo y muestra métricas, transacciones y control mensual.

## Estructura

```text
personal-dashboard/
├── infra/             # Setup de GCP y Terraform
├── services/ingestor/ # Ingesta, parsing y monitoring
├── web/dashboard/     # Frontend React + Vite
├── scripts/           # Automatizaciones de producción y mantenimiento
├── ops/               # OAuth y backfills operativos
└── .github/workflows/ # Renew watch, sync y reminders
```

## Stack real

- Ingesta: Gmail API, Pub/Sub, Cloud Run
- Persistencia: Supabase PostgreSQL
- Frontend: React + Vite + TanStack Query
- Push notifications: Firebase Cloud Messaging
- LLM fallback: Google Gemini
- Secretos: Google Secret Manager

## Quick Start

### Requisitos

- Node.js 20+
- `gcloud` autenticado
- `firebase-tools` para deploy del dashboard
- proyecto de Supabase con `service_role` y `anon key`
- credenciales OAuth de Gmail cargadas en Secret Manager

### Bootstrapping

1. Exporta variables base:

```bash
export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
export GOOGLE_CLOUD_REGION="us-central1"
```

2. Habilita APIs de GCP:

```bash
gcloud services enable \
  run.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  gmail.googleapis.com
```

3. Genera el refresh token de Gmail:

```bash
cd ops
npm install
npm run get-token
```

4. Carga secretos e infraestructura base:

```bash
cd ../infra/gcloud
./setup-secrets.sh
./setup-pubsub.sh
./setup-gmail-watch.sh
```

5. Despliega el ingestor:

```bash
cd ../../services/ingestor
npm install
npm run build
./deploy.sh
```

6. Despliega el dashboard:

```bash
cd ../../web/dashboard
npm install
npm run build
firebase deploy --only hosting
```

## Componentes

| Componente | Rol | Ubicación |
|-----------|-----|----------|
| Ingestor | Recibe Gmail push, parsea y guarda datos | [services/ingestor](/Users/thonyfd/projects/personal-dashboard/services/ingestor) |
| Dashboard | Consulta Supabase y muestra la UI | [web/dashboard](/Users/thonyfd/projects/personal-dashboard/web/dashboard) |
| Workflows | Renuevan watch, sincronizan y envían recordatorios | [.github/workflows](/Users/thonyfd/projects/personal-dashboard/.github/workflows) |
| Infra | Pub/Sub, secretos, alertas y Terraform | [infra](/Users/thonyfd/projects/personal-dashboard/infra) |
| Ops | OAuth y backfills históricos | [ops](/Users/thonyfd/projects/personal-dashboard/ops) |

## Parsers soportados

- BAC
- Clave
- Yappy
- Banistmo
- Gemini fallback para formatos no soportados

Los parsers viven en [services/ingestor/src/parsers](/Users/thonyfd/projects/personal-dashboard/services/ingestor/src/parsers).

## Operación

### Health y logs

```bash
curl https://ingestor-720071149950.us-central1.run.app/health

gcloud logging read \
  "resource.labels.service_name=ingestor" \
  --limit=50 \
  --project=mail-reader-433802

gcloud pubsub subscriptions describe gmail-ingestor-sub \
  --project=mail-reader-433802
```

### Sync manual

```bash
./scripts/production/run-daily-sync.sh
```

### Renovar watch manualmente

```bash
cd infra/gcloud
./setup-gmail-watch.sh
```

## Troubleshooting

| Problema | Revisión rápida |
|---------|------------------|
| No llegan notificaciones | Re-registrar Gmail watch y revisar Pub/Sub |
| Ingestor unhealthy | Revisar `/health` y logs de Cloud Run |
| Falla conexión a base de datos | Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` |
| Dashboard sin datos | Verificar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |

## Costos aproximados

| Servicio | Costo |
|---------|-------|
| Cloud Run ingestor | normalmente cubierto por free tier |
| Pub/Sub | normalmente cubierto por free tier |
| Secret Manager | bajo |
| Supabase | depende del plan |
| GitHub Actions | bajo o cero en uso ligero |

## Roadmap

### Completado

- Ingesta push desde Gmail
- Persistencia en Supabase
- Dashboard React con overview, merchants, reports y monthly control
- Recordatorios push vía FCM
- Sync defensivo y renovación de Gmail watch desde GitHub Actions

### Pendiente

- Mejorar visualizaciones y reportes
- Soporte de factura electrónica
- Alertas de presupuesto
- Experiencia móvil más completa

## License

MIT
