# 🔑 Renovar Gmail Refresh Token

## ❌ Problema Detectado

Tu refresh token de Gmail ha expirado. Error: `invalid_grant`

Esto causa que el sistema no pueda leer emails de Gmail.

---

## 🛠️ Solución: Generar un Nuevo Refresh Token

### Método 1: OAuth 2.0 Playground (Recomendado - 5 minutos)

#### Paso 1: Obtener Client ID y Client Secret

Primero verifica tus credenciales actuales:

```bash
~/google-cloud-sdk/bin/gcloud secrets versions access latest \
  --secret=gmail-oauth-client-id \
  --project=mail-reader-433802

~/google-cloud-sdk/bin/gcloud secrets versions access latest \
  --secret=gmail-oauth-client-secret \
  --project=mail-reader-433802
```

#### Paso 2: Ir a OAuth 2.0 Playground

1. Abre: https://developers.google.com/oauthplayground

2. Click en el **ícono de engranaje** (⚙️) arriba a la derecha

3. Marca **"Use your own OAuth credentials"**

4. Pega tus credenciales:
   - **OAuth Client ID**: (el que obtuviste arriba)
   - **OAuth Client secret**: (el que obtuviste arriba)

#### Paso 3: Autorizar Gmail API

1. En el lado izquierdo, busca **"Gmail API v1"**

2. Expande y marca:
   - ✅ `https://www.googleapis.com/auth/gmail.readonly`

3. Click **"Authorize APIs"**

4. Selecciona tu cuenta de Gmail (la que recibe los emails bancarios)

5. Google te mostrará una advertencia:
   - **"Google hasn't verified this app"**
   - Click **"Advanced"**
   - Click **"Go to [tu app] (unsafe)"**

6. Click **"Allow"** para dar permisos

#### Paso 4: Obtener el Refresh Token

1. En el playground, click **"Exchange authorization code for tokens"**

2. Verás algo como:
   ```json
   {
     "access_token": "ya29.a0...",
     "refresh_token": "1//0gXXXXXXXXX",  ← 👈 COPIA ESTE
     "expires_in": 3599,
     "scope": "https://www.googleapis.com/auth/gmail.readonly",
     "token_type": "Bearer"
   }
   ```

3. **COPIA** el `refresh_token` (empieza con `1//0g`)

#### Paso 5: Actualizar el Secret en Google Cloud

```bash
# Reemplaza NEW_REFRESH_TOKEN con el token que copiaste
echo -n "1//0gXXXXXXXXXXXXX" | ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token \
  --data-file=- \
  --project=mail-reader-433802
```

**Ejemplo real:**
```bash
echo -n "1//0gf1BqH9abc123xyz..." | ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token \
  --data-file=- \
  --project=mail-reader-433802
```

#### Paso 6: Verificar que se Actualizó

```bash
~/google-cloud-sdk/bin/gcloud secrets versions list gmail-oauth-refresh-token \
  --project=mail-reader-433802 \
  --limit=2
```

Deberías ver la nueva versión al tope.

---

### Método 2: gcloud CLI (Alternativo)

Si tienes problemas con el playground:

```bash
# 1. Iniciar OAuth flow
~/google-cloud-sdk/bin/gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/gmail.readonly

# 2. El token se guarda en:
cat ~/.config/gcloud/application_default_credentials.json | jq -r '.refresh_token'

# 3. Actualizar el secret
cat ~/.config/gcloud/application_default_credentials.json | jq -r '.refresh_token' | \
  ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token \
  --data-file=- \
  --project=mail-reader-433802
```

---

## ✅ Verificar que Funciona

### Paso 1: Esperar que Cloud Run Reinicie

El servicio Cloud Run tomará el nuevo token automáticamente en el próximo reinicio.

Puedes forzar un reinicio enviando una nueva revisión o esperando la próxima notificación.

### Paso 2: Enviar un Email de Prueba

Envíate un email de prueba a tu Gmail:

```
Para: tu-email@gmail.com
Asunto: Test - BAC

Monto: $10.50
Comercio: Test Store
Tarjeta: **** 1234
Fecha: 02/11/2025
```

### Paso 3: Verificar los Logs (1 minuto después)

```bash
~/google-cloud-sdk/bin/gcloud logging read \
  'resource.labels.service_name=ingestor AND jsonPayload.event=email_stored' \
  --limit=5 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),jsonPayload.provider,jsonPayload.subject)"
```

**Deberías ver:**
- `gmail_message_fetched` ✅
- `email_stored` ✅
- `transaction_stored` ✅ (si el formato coincide con BAC)

---

## 🐛 Si Sigue Fallando

### Error: "Google hasn't verified this app"

**Normal.** Tu app es privada. Sigue los pasos:
1. Click "Advanced"
2. Click "Go to [tu app] (unsafe)"
3. Click "Allow"

### Error: "redirect_uri_mismatch"

Verifica que el redirect URI en Google Cloud Console incluye:
```
https://developers.google.com/oauthplayground
```

Para agregar:
1. Ve a: https://console.cloud.google.com/apis/credentials?project=mail-reader-433802
2. Click en tu OAuth Client ID
3. En "Authorized redirect URIs" agrega:
   ```
   https://developers.google.com/oauthplayground
   ```
4. Guarda

### Error: "Access blocked: Authorization Error"

Tu OAuth consent screen necesita estar en "Testing" mode con tu email agregado.

1. Ve a: https://console.cloud.google.com/apis/credentials/consent?project=mail-reader-433802
2. Asegúrate de que:
   - Publishing status: **Testing**
   - Test users: **Tu email está en la lista**

---

## 📊 Monitorear el Sistema

Una vez que el token esté actualizado:

```bash
# Ver los últimos eventos
~/google-cloud-sdk/bin/gcloud logging read \
  'resource.labels.service_name=ingestor' \
  --limit=20 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),jsonPayload.event)"

# Ver solo errores
~/google-cloud-sdk/bin/gcloud logging read \
  'severity=ERROR AND resource.labels.service_name=ingestor' \
  --limit=10 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),severity,textPayload)"
```

---

## 🎯 Resumen Rápido

1. **Obtener nuevo token** → OAuth Playground
2. **Actualizar secret** → `gcloud secrets versions add`
3. **Esperar reinicio** → Automático
4. **Enviar email de prueba** → A tu Gmail
5. **Verificar logs** → Debe ver `email_stored`
6. **Refrescar dashboard** → Debe mostrar datos

---

## ⏱️ ¿Cuánto Dura el Refresh Token?

Los refresh tokens de Google pueden durar:
- **Indefinidamente** si se usan regularmente
- **Se invalidan** si:
  - Pasas 6 meses sin usarlo
  - Cambias tu contraseña
  - Revocas los permisos manualmente
  - Se alcanza el límite de 50 tokens por cuenta

**Solución:** Mantén el sistema activo recibiendo emails regularmente.

---

## 📚 Recursos

- OAuth 2.0 Playground: https://developers.google.com/oauthplayground
- Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=mail-reader-433802
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent?project=mail-reader-433802

---

**¿Necesitas ayuda?** Los logs te dirán exactamente qué está fallando.
