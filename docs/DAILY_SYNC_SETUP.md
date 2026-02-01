# 🚀 Setup de Sincronización Diaria con GitHub Actions

## 📋 Resumen

Vamos a configurar GitHub Actions para ejecutar automáticamente el script de sincronización de emails todos los días a las 6:00 AM (hora Panama).

**Ventajas:**
- ✅ 100% gratis
- ✅ Muy confiable (infraestructura Microsoft/GitHub)
- ✅ Logs excelentes en la UI
- ✅ Notificaciones automáticas por email si falla
- ✅ Ejecución manual cuando quieras
- ✅ Serverless - no requiere servidor corriendo

**Tiempo estimado:** 30 minutos

---

## 🎯 Paso 1: Configurar Workload Identity en GCP

### 1.1 Definir Variables

```bash
export PROJECT_ID="mail-reader-433802"
export POOL_NAME="github-actions-pool"
export PROVIDER_NAME="github-provider"
export SERVICE_ACCOUNT="github-actions-sa"
export GITHUB_REPO="TU-USUARIO/personal-dashboard"  # ⚠️ CAMBIAR con tu repo
```

⚠️ **IMPORTANTE:** Reemplaza `TU-USUARIO` con tu usuario real de GitHub.

### 1.2 Crear Workload Identity Pool

```bash
# Crear el pool
gcloud iam workload-identity-pools create "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Crear el provider
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 1.3 Crear Service Account

```bash
# Crear service account
gcloud iam service-accounts create "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions SA"

# Dar permisos para acceder a Secret Manager
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Dar permisos para usar Data Connect
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/dataconnect.user"
```

### 1.4 Permitir Impersonation desde GitHub

```bash
# Obtener project number
export PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

# Permitir que GitHub Actions use este service account
gcloud iam service-accounts add-iam-policy-binding \
  "${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"
```

### 1.5 Obtener Información para GitHub Secrets

```bash
# Calcular el Workload Identity Provider
export WORKLOAD_IDENTITY_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETADA - GUARDA ESTOS VALORES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Workload Identity Provider:"
echo "${WORKLOAD_IDENTITY_PROVIDER}"
echo ""
echo "Service Account Email:"
echo "${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**📝 IMPORTANTE:** Copia estos valores, los necesitarás en el siguiente paso.

---

## 🔑 Paso 2: Configurar GitHub Secrets

### 2.1 Ir a la Configuración del Repositorio

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (⚙️)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### 2.2 Agregar los Secrets

Crea estos dos secrets:

#### Secret 1: GCP_WORKLOAD_IDENTITY_PROVIDER

- **Name:** `GCP_WORKLOAD_IDENTITY_PROVIDER`
- **Value:** El valor de `WORKLOAD_IDENTITY_PROVIDER` del paso anterior

  Ejemplo: `projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`

#### Secret 2: GCP_SERVICE_ACCOUNT

- **Name:** `GCP_SERVICE_ACCOUNT`
- **Value:** `github-actions-sa@mail-reader-433802.iam.gserviceaccount.com`

### 2.3 Verificar

Deberías tener estos dos secrets configurados:
- ✅ `GCP_WORKLOAD_IDENTITY_PROVIDER`
- ✅ `GCP_SERVICE_ACCOUNT`

---

## 📦 Paso 3: Subir el Workflow a GitHub

### 3.1 Verificar que el Archivo Existe

```bash
# Verificar que el workflow existe
ls -la .github/workflows/daily-email-sync.yml
```

Deberías ver el archivo. Si no existe, asegúrate de que está en:
`.github/workflows/daily-email-sync.yml`

### 3.2 Commit y Push

```bash
# Agregar el archivo
git add .github/workflows/daily-email-sync.yml

# Commit
git commit -m "Add GitHub Actions workflow for daily email sync"

# Push
git push origin main  # o 'master' si tu branch principal es master
```

---

## 🧪 Paso 4: Probar el Workflow

### 4.1 Ejecución Manual (Recomendado primero)

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions** (▶️)
3. En el menú lateral, click en **"Daily Email Sync"**
4. Click en el botón **"Run workflow"** (▶️)
5. Selecciona la branch (normalmente `main`)
6. Click en **"Run workflow"** (verde)

### 4.2 Ver los Logs

1. Espera unos segundos y refresca la página
2. Verás una nueva ejecución en la lista
3. Click en ella para ver los detalles
4. Click en el job **"sync-emails"**
5. Expande cada step para ver los logs detallados

### 4.3 Verificar Éxito

✅ Si todo está bien, verás:
- ✅ Todos los steps en verde
- ✅ Logs del sync mostrando emails procesados
- ✅ "Sync completed successfully"

❌ Si algo falla:
- Lee los logs para identificar el error
- Verifica que los secrets estén correctos
- Verifica los permisos del service account

---

## ⏰ Paso 5: Configuración del Horario

El workflow está configurado para ejecutarse automáticamente:

```yaml
schedule:
  - cron: '0 11 * * *'  # 11:00 UTC = 6:00 AM Panama (GMT-5)
```

### Cambiar el Horario (Opcional)

Si quieres cambiar la hora, edita el archivo `.github/workflows/daily-email-sync.yml`:

```yaml
schedule:
  # Ejemplos de horarios:
  - cron: '0 11 * * *'   # 6:00 AM Panama
  - cron: '0 14 * * *'   # 9:00 AM Panama
  - cron: '0 17 * * *'   # 12:00 PM Panama (mediodía)
  - cron: '0 23 * * *'   # 6:00 PM Panama

  # Múltiples horarios:
  - cron: '0 11,23 * * *'  # 6:00 AM y 6:00 PM Panama
```

**Formato del cron:**
```
┌───────────── minuto (0-59)
│ ┌───────────── hora (0-23) UTC
│ │ ┌───────────── día del mes (1-31)
│ │ │ ┌───────────── mes (1-12)
│ │ │ │ ┌───────────── día de la semana (0-6) (0=Domingo)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**⚠️ IMPORTANTE:** Los horarios en cron son en **UTC**, no en hora local.
- Panama es GMT-5
- Para 6:00 AM Panama → usa `11` en UTC (6 + 5 = 11)

---

## 🔔 Paso 6: Configurar Notificaciones

GitHub te enviará automáticamente un email si el workflow falla.

### Personalizar Notificaciones

1. Ve a GitHub → Settings (tu perfil) → Notifications
2. Busca "Actions"
3. Asegúrate de que esté marcado:
   - ✅ "Send notifications for failed workflows"

---

## ✅ Verificación Final

Después de configurar todo, verifica que:

- [ ] ✅ Workload Identity Pool creado en GCP
- [ ] ✅ Service Account creado con permisos correctos
- [ ] ✅ Secrets configurados en GitHub
- [ ] ✅ Workflow subido al repositorio
- [ ] ✅ Ejecución manual exitosa
- [ ] ✅ Logs muestran sync completado
- [ ] ✅ Notificaciones configuradas

---

## 🎉 ¡Listo!

Una vez completado, tendrás:

✅ **Sincronización automática** todos los días a las 6 AM
✅ **Logs detallados** de cada ejecución en GitHub
✅ **Notificaciones por email** si algo falla
✅ **Ejecución manual** cuando quieras desde GitHub UI
✅ **100% gratis** y confiable
✅ **No requiere** servidor corriendo 24/7

---

## 🔧 Troubleshooting

### Error: "Workload Identity Pool not found"

**Solución:** Verifica que el pool se creó correctamente:
```bash
gcloud iam workload-identity-pools describe "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global"
```

### Error: "Permission denied on secrets"

**Solución:** Verifica permisos del service account:
```bash
gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Deberías ver:
- `roles/secretmanager.secretAccessor`
- `roles/dataconnect.user`

### Error: "Invalid audience"

**Solución:** Verifica que el `GITHUB_REPO` en el paso 1.1 sea correcto.
Debe tener el formato: `TU-USUARIO/nombre-repo`

### Workflow no se ejecuta automáticamente

**Causas posibles:**
1. El cron está mal configurado
2. GitHub Actions deshabilitado en el repo
3. El repositorio es privado y no tienes minutos disponibles

**Solución:**
1. Verifica que Actions esté habilitado: Settings → Actions → General
2. Si es repo privado, verifica minutos: Settings → Billing

---

## 📊 Monitoreo

### Ver Ejecuciones Pasadas
1. Ve a Actions
2. Click en "Daily Email Sync"
3. Verás historial de todas las ejecuciones

### Ver Estadísticas
Cada ejecución muestra:
- ✅ Emails encontrados
- ✅ Emails procesados
- ✅ Transacciones guardadas
- ✅ Duplicados omitidos
- ✅ Errores (si los hay)
- ✅ Duración total

---

## 📞 Soporte

- **GitHub Actions docs:** https://docs.github.com/en/actions
- **GCP Workload Identity:** https://cloud.google.com/iam/docs/workload-identity-federation
- **Cron syntax:** https://crontab.guru/

---

## 🔄 Mantenimiento

### Ejecutar Manualmente
Cuando quieras sincronizar fuera del horario programado:
1. Ve a Actions → Daily Email Sync
2. Run workflow → Run workflow

### Pausar Temporalmente
Para pausar las ejecuciones automáticas:
1. Ve a Actions → Daily Email Sync
2. Click en "..." → Disable workflow

Para reanudar:
1. Ve a Actions → Daily Email Sync
2. Click en "..." → Enable workflow

### Ver Último Sync
```bash
# Verificar último email procesado
npx tsx scripts/check-last-transaction.ts
```

---

**Última actualización:** 2026-01-17
**Tiempo de setup:** ~30 minutos
**Costo:** $0/mes
