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
6. GitHub Actions sincroniza cada 15 minutos y manda alertas de presupuesto por compra (ver [Alertas de presupuesto](#alertas-de-presupuesto)).

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

## Alertas de presupuesto

Cada compra nueva puede mandar un push con lo que queda del tope mensual de su categoría.

### Cómo funciona

- `.github/workflows/frequent-email-sync.yml` corre el sync cada 15 minutos (GitHub puede atrasarlo unos minutos). El workflow diario sigue renovando el watch y mandando los recordatorios de pago.
- Al terminar el sync, `scripts/production/budget-alerts.ts` busca transacciones `PURCHASE` o `TRANSFER` insertadas en las últimas 3 horas, con fecha de hoy o de ayer en Panamá y sin fila en `budget_alert_log`. Los backfills de correos viejos nunca alertan.
- Las reglas viven en `packages/supabase-queries/src/budget-alerts.ts` (funciones puras, con tests): tarjeta apagada, compra grande, presupuesto bajo 80 %, entre 80 % y 99 %, y 100 % o más. Sale un solo push por transacción.
- El gasto sale de `budget_status()`: `PURCHASE + TRANSFER - REFUND` del mes, por categoría del comercio. La página Budgets usa la misma función, así que la cifra de la web y la del push coinciden.
- Antes de enviar se inserta la fila en `budget_alert_log`, así que una transacción recibe como máximo un push.
- El sync frecuente no tiene `GEMINI_API_KEY`: los correos que solo entiende el fallback LLM se resuelven en la corrida diaria, y su alerta llega esa mañana.
- Los logs solo llevan ids, reglas y conteos. Los logs de Actions de este repo son públicos.

### Despliegue (lo corre el dueño)

1. Revisar RLS: correr `supabase/checks/rls_diagnostic.sql` en el SQL editor. Si no aparecen políticas `Owner only` ni `app_owner`, aplicar primero `20261102000001_app_owner.sql` (y luego insertar el uid del dueño en `app_owner`), `20261102000002_multi_user_rls.sql` y `supabase/checks/multi_user_rls_check.sql`.
2. Aplicar en orden `supabase/migrations/20261123000001_revoke_anon_privileges.sql` y `20261123000002_budgets.sql`.
3. Correr `supabase/checks/budget_status_check.sql`. Todos los checks deben decir `true`.
4. Copiar `supabase/examples/budgets_setup.example.sql` fuera del repo, poner los valores reales en la copia y correrla.
5. Correr `ops/top-merchants-90d.sql` y corregir categorías desde la web (página Merchants).
6. Pasar los cambios a `main`: los workflows programados solo corren en la rama por defecto.
7. Probar con datos reales sin enviar, desde tu máquina y nunca en Actions:

   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
     npx tsx scripts/production/budget-alert-dry-run.ts <id> <id> <id>
   ```

8. Encender: `gh variable set BUDGET_ALERTS_ENABLED --body true`. Luego hacer una compra real pequeña.

### Apagar (rollback)

- Sin deploy: `gh variable set BUDGET_ALERTS_ENABLED --body false`.
- Desde la web o SQL: `UPDATE alert_settings SET alerts_enabled = false WHERE id = 1;`

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
