# AI Finance Agent

Serverless AI agent that monitors Gmail for financial transactions, extracts key data, and powers a React dashboard.

**Status:** ✅ Production ready
**Project:** mail-reader-433802
**Time Zone:** America/Panama (GMT-5)

## Architecture

### Nueva Arquitectura Híbrida (Push + Polling)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Gmail Monitoring System                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Push Mode  │    │ Fallback    │    │  Health     │    │ Auto-Renew  │ │
│  │  (Primary)  │    │   Polling   │    │ Monitoring  │    │   Token     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Cloud Run   │    │ Cloud Run   │    │ Cloud Run   │    │ Cloud Run   │ │
│  │ (Ingestor)  │    │ (Poller)    │    │ (Monitor)   │    │ (Renewal)   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Pub/Sub     │    │ Cloud       │    │ Cloud       │    │ Cloud       │ │
│  │ Push        │    │ Scheduler   │    │ Scheduler   │    │ Scheduler   │ │
│  │             │    │ (cada 1h)   │    │ (cada 6h)   │    │ (diario)    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    Firebase Data Connect (PostgreSQL)                │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        React Dashboard                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Operación

1. **Modo Primario (Push)**: Gmail envía notificaciones en tiempo real → Ingestor procesa inmediatamente
2. **Modo Fallback (Polling)**: Si push falla, Poller consulta cada hora → recupera emails perdidos
3. **Monitoreo Proactivo**: Health checks cada 6 horas → detecta problemas antes de que fallen
4. **Renovación Automática**: Renewal diario → mantiene tokens válidos

### Beneficios

✅ **Resiliencia Total**: Nunca deja de procesar emails completamente
✅ **Cero Downtime**: Push falla → Polling se activa automáticamente
✅ **Alertas Proactivas**: Detecta expiración de tokens antes de que cause problemas
✅ **Costo Optimizado**: Mantiene free tier (~$10/mes)
✅ **Mantenimiento Automático**: Renovación de tokens y watch sin intervención

## Project Structure

```
personal-dashboard/
├── infra/           # Infrastructure setup scripts
│   └── gcloud/      # GCP resource setup (Pub/Sub, secrets, scheduler)
├── services/        # Backend services
│   ├── ingestor/    # Email ingestion and parsing service (push primary)
│   ├── poller/      # Gmail polling service (fallback when push fails)
│   └── renewal/     # Gmail watch renewal service (runs daily)
├── dataconnect/     # Firebase Data Connect schema & queries
├── web/dashboard/   # React dashboard application
├── scripts/         # Utility scripts (populate data, etc.)
└── ops/             # Operational tools (backfill, OAuth setup)
```

## Features

- **Real-time email monitoring** via Gmail Push Notifications
- **Automatic transaction parsing** for BAC, Clave, Yappy, and Banistmo
- **LLM fallback** using Anthropic Claude for unknown formats
- **Idempotent processing** with SHA256 hashing
- **React dashboard** with overview, transactions, and merchants pages
- **Secure credential storage** in Google Secret Manager
- **Cost-effective:** ~$10/month after free tier

## Security

- OAuth credentials stored in Google Secret Manager
- Workload Identity for service authentication
- Email body hashing to avoid storing PII
- Gmail readonly scope only
- No credentials committed to repository

## Quick Start

### Prerequisites

- Google Cloud Project with billing enabled
- Firebase CLI installed: `npm install -g firebase-tools`
- gcloud CLI installed and authenticated
- Node.js 20+
- Gmail account for monitoring

### Deployment Steps

1. **Set environment variables**
   ```bash
   export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
   export GOOGLE_CLOUD_REGION="us-central1"
   ```

2. **Enable GCP APIs**
   ```bash
   gcloud services enable run.googleapis.com pubsub.googleapis.com \
     secretmanager.googleapis.com cloudscheduler.googleapis.com \
     gmail.googleapis.com firebasedataconnect.googleapis.com
   ```

3. **Setup OAuth credentials**
   ```bash
   cd ops
   npm install
   npm run get-token  # Follow interactive prompts
   ```

4. **Store secrets in Secret Manager**
   ```bash
   cd ../infra/gcloud
   ./setup-secrets.sh
   # Add your OAuth credentials when prompted
   ```

5. **Setup Pub/Sub**
   ```bash
   ./setup-pubsub.sh
   ```

6. **Deploy Firebase Data Connect**
   ```bash
   firebase login
   firebase use mail-reader-433802
   firebase dataconnect:sdk:generate
   firebase deploy --only dataconnect
   ```

7. **Deploy ingestor service**
   ```bash
   cd ../../services/ingestor
   npm install
   npm run build
   ./deploy.sh
   ```

8. **Setup Gmail watch**
   ```bash
   cd ../../infra/gcloud
   ./setup-gmail-watch.sh
   ```

9. **Deploy dashboard**
   ```bash
   cd ../../web/dashboard
   npm install
   npm run build
   firebase deploy --only hosting
   ```

## Supported Banks & Parsers

The system currently supports:

- **BAC** (Banco de América Central) - Credit/debit cards
- **Clave** - Panama digital payment system
- **Yappy** - Banco General mobile payments
- **Banistmo** - Credit/debit cards
- **LLM Fallback** - Anthropic Claude for unknown formats

Add new parsers in [services/ingestor/src/parsers/](services/ingestor/src/parsers/)

## Components

| Component | Description | Location |
|-----------|-------------|----------|
| **Ingestor** | Receives Gmail notifications, parses transactions (modo primario) | [services/ingestor/](services/ingestor/) |
| **Poller** | Gmail polling service (fallback cuando push falla) | [services/poller/](services/poller/) |
| **Renewal** | Renews Gmail watch daily (expires every 7 days) | [services/renewal/](services/renewal/) |
| **Dashboard** | React app with overview, transactions, merchants | [web/dashboard/](web/dashboard/) |
| **Data Connect** | PostgreSQL schema and GraphQL queries | [dataconnect/](dataconnect/) |
| **Infrastructure** | GCP setup scripts (Pub/Sub, secrets, etc.) | [infra/gcloud/](infra/gcloud/) |
| **Backfill** | Process historical emails | [ops/](ops/) |

## Monitoring & Troubleshooting

### Check System Health

```bash
# Health check
curl https://ingestor-720071149950.us-central1.run.app/health

# View recent logs
~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor" \
  --limit=50 --project=mail-reader-433802

# Check Pub/Sub subscription
~/google-cloud-sdk/bin/gcloud pubsub subscriptions describe gmail-ingestor-sub \
  --project=mail-reader-433802
```

### Common Issues

| Issue | Solution |
|-------|----------|
| No notifications arriving | Re-run `./setup-gmail-watch.sh` |
| Service unhealthy | Check logs with `gcloud logging read` |
| Parser not detecting transactions | Review logs for `parse_failed` events |
| Database connection fails | Verify Data Connect is deployed: `firebase deploy --only dataconnect` |

### Renew Gmail Watch

Gmail watch expires every 7 days. Renew manually or setup Cloud Scheduler:

```bash
cd infra/gcloud
./setup-gmail-watch.sh
```

## Cost Estimate

| Service | Monthly Cost | Notas |
|---------|--------------|-------|
| Cloud Run (3 servicios) | $0 (free tier) | Ingestor, Poller, Renewal |
| Pub/Sub | $0 (free tier) | Push notifications |
| Firebase Data Connect | $9 (after 3-month trial) | PostgreSQL database |
| Secret Manager | $0 (free tier) | OAuth credentials |
| Cloud Scheduler (3 jobs) | $0 (3 jobs free) | Health check, Polling, Renewal |
| **Total** | **~$10/month** | Mantiene free tier |

## Roadmap

### Completed ✅
- Real-time email monitoring via Gmail Push
- Transaction parsing for BAC, Clave, Yappy, Banistmo
- PostgreSQL database with Firebase Data Connect
- React dashboard with overview and transaction list
- Merchant tracking and statistics
- Category system with merchant categorization
- Idempotent processing with deduplication

### Completed ✅
- Real-time email monitoring via Gmail Push
- Transaction parsing for BAC, Clave, Yappy, Banistmo
- PostgreSQL database with Firebase Data Connect
- React dashboard with overview and transaction list
- Merchant tracking and statistics
- Category system with merchant categorization
- Idempotent processing with deduplication
- **Nueva Arquitectura Híbrida**: Push + Polling fallback
- **Monitoreo Proactivo**: Alertas automáticas de expiración de tokens
- **Resiliencia Total**: Nunca deja de procesar emails

### Planned 🔧
- [ ] Charts and visualizations
- [ ] Transaction time (hour/minute, not just date)
- [ ] Electronic invoice (factura electrónica) support
- [ ] Budget tracking and alerts
- [ ] Mobile app version
- [ ] Export to PDF reports

### Known Issues 🐛
- Automatic registration not working correctly
- Categories not updating properly in some cases

## License

MIT
