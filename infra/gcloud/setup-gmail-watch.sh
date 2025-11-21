#!/bin/bash

# Gmail Watch Setup Script
# Configura Gmail push notifications para enviar notificaciones a Pub/Sub

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Gmail Watch Setup${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""

# Verificar variables de entorno
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
  echo -e "${RED}Error: GOOGLE_CLOUD_PROJECT no está configurado${NC}"
  echo "Ejecuta: export GOOGLE_CLOUD_PROJECT=mail-reader-433802"
  exit 1
fi

PROJECT_ID=$GOOGLE_CLOUD_PROJECT
TOPIC_NAME="gmail-notifications"
PUBSUB_TOPIC="projects/${PROJECT_ID}/topics/${TOPIC_NAME}"

echo -e "${YELLOW}Proyecto:${NC} $PROJECT_ID"
echo -e "${YELLOW}Topic:${NC} $PUBSUB_TOPIC"
echo ""

# Paso 1: Verificar que el topic existe
echo -e "${GREEN}[1/5] Verificando Pub/Sub topic...${NC}"
if ~/google-cloud-sdk/bin/gcloud pubsub topics describe $TOPIC_NAME --project=$PROJECT_ID &> /dev/null; then
  echo -e "${GREEN}✓ Topic existe${NC}"
else
  echo -e "${YELLOW}⚠ Topic no existe. Creándolo...${NC}"
  ~/google-cloud-sdk/bin/gcloud pubsub topics create $TOPIC_NAME --project=$PROJECT_ID
  echo -e "${GREEN}✓ Topic creado${NC}"
fi
echo ""

# Paso 2: Dar permisos a Gmail para publicar en el topic
echo -e "${GREEN}[2/5] Configurando permisos para Gmail...${NC}"
~/google-cloud-sdk/bin/gcloud pubsub topics add-iam-policy-binding $TOPIC_NAME \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher \
  --project=$PROJECT_ID \
  --quiet

echo -e "${GREEN}✓ Permisos configurados${NC}"
echo ""

# Paso 3: Obtener refresh token de Secret Manager
echo -e "${GREEN}[3/5] Obteniendo credenciales OAuth de Secret Manager...${NC}"
CLIENT_ID=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-client-id --project=$PROJECT_ID)
CLIENT_SECRET=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-client-secret --project=$PROJECT_ID)
REFRESH_TOKEN=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-refresh-token --project=$PROJECT_ID)

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REFRESH_TOKEN" ]; then
  echo -e "${RED}✗ Error: No se pudieron obtener las credenciales OAuth${NC}"
  echo "Asegúrate de que los secretos estén configurados correctamente."
  exit 1
fi

echo -e "${GREEN}✓ Credenciales obtenidas${NC}"
echo ""

# Paso 4: Obtener access token desde refresh token
echo -e "${GREEN}[4/5] Obteniendo access token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "grant_type=refresh_token")

# Verificar si jq está disponible
if command -v jq &> /dev/null; then
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
else
  # Fallback usando python si jq no está disponible
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}✗ Error al obtener access token${NC}"
  echo "Respuesta: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Access token obtenido${NC}"
echo ""

# Paso 5: Configurar Gmail watch
echo -e "${GREEN}[5/5] Configurando Gmail watch...${NC}"

WATCH_REQUEST="{
  \"topicName\": \"$PUBSUB_TOPIC\",
  \"labelIds\": [\"INBOX\"]
}"

echo -e "${YELLOW}Enviando request a Gmail API...${NC}"
WATCH_RESPONSE=$(curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$WATCH_REQUEST")

# Verificar si hay error
if echo "$WATCH_RESPONSE" | grep -q "error"; then
  echo -e "${RED}✗ Error al configurar Gmail watch${NC}"
  echo "$WATCH_RESPONSE" | jq '.'
  exit 1
fi

# Extraer información del watch
if command -v jq &> /dev/null; then
  HISTORY_ID=$(echo "$WATCH_RESPONSE" | jq -r '.historyId')
  EXPIRATION=$(echo "$WATCH_RESPONSE" | jq -r '.expiration')
else
  HISTORY_ID=$(echo "$WATCH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('historyId', ''))")
  EXPIRATION=$(echo "$WATCH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('expiration', ''))")
fi

# Convertir expiration timestamp a fecha legible
if [ ! -z "$EXPIRATION" ] && [ "$EXPIRATION" != "null" ]; then
  # Remover los últimos 3 dígitos (milisegundos) para date
  EXPIRATION_SECONDS=${EXPIRATION:0:-3}
  EXPIRATION_DATE=$(date -r $EXPIRATION_SECONDS "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Expira en 7 días")
else
  EXPIRATION_DATE="Expira en 7 días"
fi

echo -e "${GREEN}✓ Gmail watch configurado exitosamente${NC}"
echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Configuración Completada${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${YELLOW}Detalles del Watch:${NC}"
echo -e "  History ID: ${GREEN}$HISTORY_ID${NC}"
echo -e "  Expira: ${YELLOW}$EXPIRATION_DATE${NC}"
echo -e "  Topic: ${GREEN}$PUBSUB_TOPIC${NC}"
echo ""
echo -e "${YELLOW}Nota:${NC} El watch expira cada 7 días. Necesitas renovarlo periódicamente."
echo -e "${YELLOW}Tip:${NC} Configura Cloud Scheduler para renovarlo automáticamente."
echo ""
echo -e "${GREEN}¡Listo! Ahora Gmail enviará notificaciones push a tu Pub/Sub topic.${NC}"
echo ""
echo -e "${YELLOW}Para probar:${NC}"
echo "  1. Envíate un email"
echo "  2. Verifica los logs:"
echo "     ~/google-cloud-sdk/bin/gcloud logging read 'resource.labels.service_name=ingestor' --limit=10"
echo ""
