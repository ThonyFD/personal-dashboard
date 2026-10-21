#!/bin/bash

# Script para verificar diferentes tipos de logs del sistema

PROJECT_ID="mail-reader-433802"

echo "🔍 Verificando logs del sistema..."
echo ""

# Función para mostrar logs con color
show_logs() {
  local event=$1
  local description=$2

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  ~/google-cloud-sdk/bin/gcloud logging read \
    "resource.labels.service_name=ingestor AND jsonPayload.event=$event" \
    --limit=5 \
    --project=$PROJECT_ID \
    --format=json | jq -r '.[] | "\(.timestamp) [\(.severity)] \(.jsonPayload | tostring)"'

  echo ""
}

# 1. Notificaciones recibidas
show_logs "pubsub_received" "Notificaciones de Pub/Sub recibidas"

# 2. Emails guardados
show_logs "email_stored" "Emails guardados en la base de datos"

# 3. Transacciones procesadas
show_logs "transaction_stored" "Transacciones extraídas y guardadas"

# 4. Errores de parseo
show_logs "parse_failed" "Emails que no se pudieron parsear"

# 5. Errores generales
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ Errores recientes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor AND severity=ERROR" \
  --limit=5 \
  --project=$PROJECT_ID \
  --format=json | jq -r '.[] | "\(.timestamp) [\(.severity)] \(.jsonPayload.message // .textPayload)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Estadísticas de hoy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Contar eventos de hoy
TODAY=$(date -u +%Y-%m-%dT00:00:00Z)

PUBSUB_COUNT=$(~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor AND jsonPayload.event=pubsub_received AND timestamp>=\"$TODAY\"" \
  --project=$PROJECT_ID \
  --format=json | jq '. | length')

EMAIL_COUNT=$(~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor AND jsonPayload.event=email_stored AND timestamp>=\"$TODAY\"" \
  --project=$PROJECT_ID \
  --format=json | jq '. | length')

TXN_COUNT=$(~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor AND jsonPayload.event=transaction_stored AND timestamp>=\"$TODAY\"" \
  --project=$PROJECT_ID \
  --format=json | jq '. | length')

ERROR_COUNT=$(~/google-cloud-sdk/bin/gcloud logging read \
  "resource.labels.service_name=ingestor AND severity=ERROR AND timestamp>=\"$TODAY\"" \
  --project=$PROJECT_ID \
  --format=json | jq '. | length')

echo "Notificaciones recibidas: $PUBSUB_COUNT"
echo "Emails procesados: $EMAIL_COUNT"
echo "Transacciones extraídas: $TXN_COUNT"
echo "Errores: $ERROR_COUNT"
echo ""

echo "✅ Verificación completa!"
