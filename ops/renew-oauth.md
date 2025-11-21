# Renovar OAuth Credentials para Gmail

## Problema
El refresh token de OAuth ha expirado. Necesitas generar nuevas credenciales.

## Pasos para Renovar

### 1. Obtener Client ID y Client Secret actuales
```bash
~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-client-id --project=mail-reader-433802
~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-client-secret --project=mail-reader-433802
```

### 2. Generar nuevo Refresh Token

Necesitas autorizar la aplicación nuevamente usando el OAuth 2.0 Playground o un flujo de autorización.

**Opción A: Usar OAuth 2.0 Playground**
1. Ve a: https://developers.google.com/oauthplayground/
2. Click en el ícono de configuración (⚙️) en la esquina superior derecha
3. Marca "Use your own OAuth credentials"
4. Ingresa tu Client ID y Client Secret
5. En el panel izquierdo, busca "Gmail API v1"
6. Selecciona el scope: `https://www.googleapis.com/auth/gmail.readonly`
7. Click en "Authorize APIs"
8. Autoriza con tu cuenta de Gmail
9. Click en "Exchange authorization code for tokens"
10. Copia el **Refresh token**

**Opción B: Usar script de Python (más rápido)**

Crea un archivo `get_refresh_token.py`:
```python
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Reemplaza con tus credenciales
CLIENT_ID = 'tu-client-id'
CLIENT_SECRET = 'tu-client-secret'

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uris": ["http://localhost"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
    }
}

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=0)

print("\nRefresh Token:")
print(creds.refresh_token)
```

Ejecuta:
```bash
pip install google-auth-oauthlib
python get_refresh_token.py
```

### 3. Actualizar el Secret en Google Cloud

```bash
# Guarda el nuevo refresh token en Secret Manager
echo -n "TU_NUEVO_REFRESH_TOKEN" | ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token --data-file=- --project=mail-reader-433802
```

### 4. Verificar que el servicio funcione

```bash
# Verificar health del OAuth
curl https://ingestor-iswgxwwvra-uc.a.run.app/health/oauth
```

Si devuelve `"status": "healthy"`, todo está funcionando correctamente.

### 5. Renovar Gmail Watch

```bash
cd /Users/thonyfd/projects/personal-dashboard/infra/gcloud
export GOOGLE_CLOUD_PROJECT=mail-reader-433802
./setup-gmail-watch.sh
```

## Notas Importantes

- El refresh token puede expirar si no se usa por 6 meses
- Gmail Watch expira cada 7 días y debe renovarse
- Si cambias la contraseña de Gmail, debes regenerar el refresh token
