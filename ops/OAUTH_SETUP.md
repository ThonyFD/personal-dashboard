# Gmail OAuth Setup - Quick Guide

Este documento te guía paso a paso para obtener las credenciales OAuth necesarias.

## Paso 1: Crear OAuth Client ID

1. Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Selecciona tu proyecto (asegúrate que sea el correcto)

3. Click en **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

4. Si es la primera vez:
   - Click en **"CONFIGURE CONSENT SCREEN"**
   - Elige **"External"** (o Internal si es workspace)
   - Llena la información básica:
     - App name: "AI Finance Agent"
     - User support email: tu email
     - Developer contact: tu email
   - Click **"SAVE AND CONTINUE"**
   - En **Scopes**: no agregues nada, click **"SAVE AND CONTINUE"**
   - En **Test users**: agrega tu cuenta de Gmail
   - Click **"SAVE AND CONTINUE"**
   - Click **"BACK TO DASHBOARD"**

5. Regresa a **Credentials** y click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

6. Application type: **"Desktop app"**

7. Name: "Finance Agent Desktop"

8. Click **"CREATE"**

9. **IMPORTANTE**: Antes de descargar, haz esto:
   - Click en el nombre de tu OAuth client que acabas de crear
   - En **"Authorized redirect URIs"** agrega estas dos URIs:
     ```
     http://localhost:3000/oauth2callback
     ```
     ```
     urn:ietf:wg:oauth:2.0:oob
     ```
   - Click **"SAVE"**

10. Ahora sí, descarga el JSON (click en el ícono de download)

11. Renombra el archivo descargado a `credentials.json`

12. Mueve `credentials.json` a la carpeta `ops/` de este proyecto

## Paso 2: Obtener Refresh Token

```bash
cd ops

# Instalar dependencias
npm install

# Ejecutar el script
npm run get-token
```

El script te va a preguntar:
```
Choose authentication method:
1. Local server (recommended - opens browser automatically)
2. Manual code entry (if port 3000 is blocked)

Enter choice (1 or 2):
```

### Opción 1 - Local Server (Recomendado)

1. Escribe `1` y presiona Enter
2. Se abrirá tu navegador automáticamente
3. Inicia sesión con tu cuenta de Gmail
4. Acepta los permisos (solo lectura)
5. El navegador te mostrará "✅ Authentication successful!"
6. Regresa a la terminal

### Opción 2 - Manual Code

1. Escribe `2` y presiona Enter
2. Copia la URL que aparece en la terminal
3. Pégala en tu navegador
4. Inicia sesión con tu cuenta de Gmail
5. Acepta los permisos
6. Copia el código que te da Google
7. Pégalo en la terminal y presiona Enter

## Paso 3: Guardar en Secret Manager

El script te mostrará 3 comandos al final. Cópialos y ejecútalos:

```bash
echo -n 'tu-client-id-aqui' | gcloud secrets versions add gmail-oauth-client-id --data-file=-

echo -n 'tu-client-secret-aqui' | gcloud secrets versions add gmail-oauth-client-secret --data-file=-

echo -n 'tu-refresh-token-aqui' | gcloud secrets versions add gmail-oauth-refresh-token --data-file=-
```

## Verificación

Para verificar que los secrets se guardaron correctamente:

```bash
gcloud secrets list --project=$GOOGLE_CLOUD_PROJECT
```

Deberías ver:
- gmail-oauth-client-id
- gmail-oauth-client-secret
- gmail-oauth-refresh-token

## Troubleshooting

### Error: "redirect_uri_mismatch"

Significa que olvidaste agregar las redirect URIs en el paso 1.9

**Solución:**
1. Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click en tu OAuth client ID
3. En "Authorized redirect URIs" agrega:
   - `http://localhost:3000/oauth2callback`
   - `urn:ietf:wg:oauth:2.0:oob`
4. Click SAVE
5. Vuelve a ejecutar `npm run get-token`

### Error: "Access blocked: This app's request is invalid"

Significa que tu cuenta no está en la lista de test users.

**Solución:**
1. Ve a [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll down a "Test users"
3. Click "+ ADD USERS"
4. Agrega tu email de Gmail
5. Click SAVE
6. Vuelve a ejecutar `npm run get-token`

### Error: "credentials.json not found"

**Solución:**
Asegúrate de que el archivo `credentials.json` está en la carpeta `ops/`

```bash
ls -la ops/credentials.json
```

Si no existe, descárgalo de nuevo del paso 1.

### El puerto 3000 está ocupado

**Solución:**
Usa la opción 2 (Manual code entry) en lugar de la opción 1.

## Seguridad

⚠️ **IMPORTANTE**:
- ✅ Los archivos `credentials.json` y `token.json` están en `.gitignore`
- ✅ NUNCA hagas commit de estos archivos
- ✅ Los secrets deben estar SOLO en Secret Manager
- ✅ Si accidentalmente haces commit, revoca el OAuth client y crea uno nuevo

## Próximo Paso

Una vez completado esto, puedes continuar con el deployment en [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md#step-4-store-secrets)
