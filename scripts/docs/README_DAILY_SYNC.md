# 🔄 Script de Sincronización Diaria - Guía Rápida

## 📋 Resumen

Se ha creado un **script único de producción** para sincronizar correos diariamente:

**Script:** `sync-emails-daily.ts`

Este script:
- ✅ Carga correos desde el **último procesado** hasta ahora
- ✅ Calcula automáticamente el período de lookback
- ✅ Es **idempotente** (no duplica correos)
- ✅ Maneja errores robustamente
- ✅ Muestra estadísticas detalladas

---

## 🚀 Ejecución Manual

### Opción 1: Usar el wrapper (Recomendado)
```bash
cd /path/to/personal-dashboard
./scripts/run-daily-sync.sh
```

### Opción 2: Directamente
```bash
cd scripts
npx tsx sync-emails-daily.ts
```

---

## ⏰ Automatización (GitHub Actions)

**✅ CONFIGURADO:** El workflow de GitHub Actions ya está listo en:
`.github/workflows/daily-email-sync.yml`

### Para activarlo:

**1. Sigue la guía paso a paso:**
```bash
# Ver la guía completa
cat docs/DAILY_SYNC_SETUP.md
```

**2. Resumen rápido:**
- Configurar Workload Identity en GCP (15 min)
- Agregar secrets en GitHub (5 min)
- Push del workflow (1 min)
- Probar ejecución manual (5 min)

**3. Resultado:**
- ✅ Sincronización automática diaria a las 6:00 AM
- ✅ Logs en GitHub Actions UI
- ✅ Notificaciones por email si falla
- ✅ 100% gratis

---

## 📊 Funcionalidades

### Cálculo Inteligente de Fechas
```typescript
// Obtiene el último email de la BD
const lastEmail = await getLastProcessedEmail();

// Calcula cuántos días han pasado
const daysSince = calculateDaysSince(lastEmail);

// Crea query de Gmail para ese período
const query = `label:financial after:${startDate}`;
```

### Idempotencia
```typescript
// Usa el mismo hash que el servicio ingestor
const bodyHash = generateEmailBodyHash(emailBody);

// Crea idempotency key única
const idempotencyKey = generateIdempotencyKey(
  emailId,
  transaction.date,
  transaction.amount,
  transaction.merchant
);
```

### Estadísticas Detalladas
```
📊 SYNC STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Emails Found:       45
Successfully Processed:   45
Transactions Saved:       42
Duplicates Skipped:       3
Failed:                   0
Duration:                 12.45s
Rate:                     3.61 emails/sec
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 Configuración

### Variables de Entorno (Opcionales)

```bash
# Override del proyecto GCP
export GOOGLE_CLOUD_PROJECT="mail-reader-433802"

# Override del período de lookback (días)
export LOOKBACK_DAYS=7
```

### Límites de Seguridad

```typescript
const DEFAULT_LOOKBACK_DAYS = 7;   // Si no hay emails previos
const MAX_LOOKBACK_DAYS = 30;       // Límite máximo de seguridad
const RATE_LIMIT_DELAY_MS = 100;    // 10 req/seg (conservador)
```

---

## 📚 Documentación

### Guías Principales
- **Setup de GitHub Actions:** `docs/DAILY_SYNC_SETUP.md` ⭐
- **Comparación de opciones:** `docs/SCHEDULING_OPTIONS.md`
- **Guía de limpieza:** `scripts/CLEANUP_GUIDE.md`
- **Resumen de cambios:** `scripts/RESUMEN_CAMBIOS.md`

### Archivos del Script
- **Script principal:** `scripts/sync-emails-daily.ts`
- **Wrapper shell:** `scripts/run-daily-sync.sh`
- **Workflow GitHub:** `.github/workflows/daily-email-sync.yml`

---

## ✅ Verificación

### Verificar Último Email Procesado
```bash
npx tsx scripts/check-last-transaction.ts
```

### Ver Logs de GitHub Actions
1. Ve a GitHub → Tu repo → Actions
2. Click en "Daily Email Sync"
3. Click en la ejecución que quieres ver
4. Expande los steps para ver logs

---

## 🛠️ Troubleshooting

### "No se encontró el último email"
**Causa:** Primera ejecución o BD vacía
**Solución:** El script usará `DEFAULT_LOOKBACK_DAYS` (7 días)

### "Duplicates skipped"
**Causa:** Emails ya procesados en ejecución anterior
**Solución:** Normal, el script es idempotente

### "Rate limit exceeded"
**Causa:** Demasiadas peticiones a Gmail API
**Solución:** El script ya tiene rate limiting (100ms entre requests)

### Verificar permisos GCP
```bash
# Verificar service account
gcloud projects get-iam-policy mail-reader-433802 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-sa@mail-reader-433802.iam.gserviceaccount.com"
```

---

## 🎯 Próximos Pasos

1. **Probar manualmente:**
   ```bash
   ./scripts/run-daily-sync.sh
   ```

2. **Verificar resultados:**
   ```bash
   npx tsx scripts/check-last-transaction.ts
   ```

3. **Configurar GitHub Actions:**
   ```bash
   # Seguir guía completa
   cat docs/DAILY_SYNC_SETUP.md
   ```

4. **Limpiar scripts viejos** (opcional):
   ```bash
   # Seguir guía de limpieza
   cat scripts/CLEANUP_GUIDE.md
   ```

---

## 📞 Soporte

- **Código del script:** `scripts/sync-emails-daily.ts` (bien comentado)
- **Setup de automatización:** `docs/DAILY_SYNC_SETUP.md`
- **Comparación de opciones:** `docs/SCHEDULING_OPTIONS.md`

---

## ✨ Características Destacadas

### 🎯 Inteligente
- Calcula automáticamente desde cuándo sincronizar
- Detecta providers (BAC, Clave, Yappy, Banistmo)
- Auto-categoriza merchants

### 🛡️ Robusto
- Idempotente (ejecuta múltiples veces sin duplicar)
- Rate limiting incorporado
- Manejo completo de errores
- Continúa procesando si algunos emails fallan

### 📊 Informativo
- Estadísticas detalladas al final
- Logs claros de cada paso
- Reporta duplicados vs nuevos
- Muestra rate de procesamiento

### 🔌 Integrado
- Usa el pipeline completo del ingestor
- Mismo hash que el servicio
- Misma lógica de parseo
- Mismas validaciones

---

**Última actualización:** 2026-01-17
**Versión:** 1.0.0
**Estado:** ✅ Listo para producción
