# Ingestor Service

Servicio de Cloud Run que recibe notificaciones push de Gmail vía Pub/Sub, parsea correos financieros y persiste el resultado en Supabase.

## Arquitectura

```text
Gmail -> Pub/Sub -> Cloud Run ingestor -> Supabase PostgreSQL
```

## Responsabilidades

- recibir eventos push de Gmail
- descargar el mensaje completo desde Gmail API
- detectar proveedor y parser aplicable
- extraer emails, merchants y transacciones
- insertar datos de forma idempotente
- exponer endpoints de health y metrics

## Variables de entorno

Requeridas:

- `GOOGLE_CLOUD_PROJECT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Opcionales según el flujo:

- `GOOGLE_CLOUD_REGION`
- `GEMINI_API_KEY`

## Secretos en Secret Manager

- `gmail-oauth-client-id`
- `gmail-oauth-client-secret`
- `gmail-oauth-refresh-token`

## Desarrollo local

```bash
npm install

export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

npm run dev
```

## Deploy

```bash
export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
export GOOGLE_CLOUD_REGION="us-central1"

./deploy.sh
```

La infraestructura base de Pub/Sub y secretos vive en [infra/README.md](/Users/thonyfd/projects/personal-dashboard/infra/README.md).

## Endpoints

- `GET /health`
- `GET /monitoring/health`
- `GET /monitoring/metrics`
- `POST /pubsub`
- `POST /trigger/:messageId`

## Proveedores soportados

- BAC
- Clave
- Yappy
- Banistmo
- fallback con Gemini para formatos desconocidos

Los parsers viven en [src/parsers](/Users/thonyfd/projects/personal-dashboard/services/ingestor/src/parsers).

## Monitoreo

Revisar especialmente:

- latencia del servicio
- tasa de errores
- backlog de Pub/Sub
- actividad reciente de emails y transacciones
