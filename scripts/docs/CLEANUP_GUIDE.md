# Scripts Cleanup Guide

## 📋 Resumen

Se ha creado un único script de producción para sincronizar correos diariamente: **`sync-emails-daily.ts`**

Este script reemplaza múltiples scripts redundantes y proporciona una solución consolidada y lista para producción.

---

## ✅ Script Principal de Producción

### `sync-emails-daily.ts`
**Propósito:** Script único para cargar correos desde el último correo procesado hasta la fecha actual.

**Características:**
- ✅ Sincroniza emails desde el último email en la BD
- ✅ Manejo automático de fechas (calcula lookback period)
- ✅ Idempotente (no duplica emails ya procesados)
- ✅ Rate limiting para respetar límites de Gmail API
- ✅ Manejo completo de errores
- ✅ Estadísticas detalladas de sincronización
- ✅ Usa pipeline completo de ingestión (parsers, DB client)
- ✅ Auto-categorización de merchants

**Uso:**
```bash
# Opción 1: Usando el wrapper
./scripts/run-daily-sync.sh

# Opción 2: Directamente
cd scripts
npx tsx sync-emails-daily.ts
```

**Variables de Entorno (Opcionales):**
- `GOOGLE_CLOUD_PROJECT` - ID del proyecto GCP (default: mail-reader-433802)
- `LOOKBACK_DAYS` - Override del período de lookback (default: calculado automáticamente)

---

## 🗑️ Scripts Redundantes que se Pueden ELIMINAR

### Categoría: Backfill y Población Histórica
Estos scripts fueron útiles para carga inicial, pero ya no son necesarios en producción:

```bash
# Scripts de backfill (ya cumplieron su propósito)
scripts/populate-december-2025.ts          # ❌ Eliminar - carga específica de diciembre
scripts/populate-manual-transactions.ts     # ❌ Eliminar - carga manual obsoleta
scripts/populate-merchants.ts               # ❌ Eliminar - población inicial ya hecha
scripts/populate-monthly-transactions.ts    # ❌ Eliminar - carga mensual específica
scripts/populate-via-ingestor.ts           # ❌ Eliminar - test de ingestor

# Scripts de reprocess
scripts/reprocess-banistmo.ts              # ❌ Eliminar - reproceso puntual completado
scripts/reprocess-banistmo-v2.sh           # ❌ Eliminar - versión antigua
scripts/reprocess-banistmo.sh              # ❌ Eliminar - versión antigua
```

### Categoría: Migraciones de BD (Ya Completadas)
```bash
scripts/migrate-categories.ts              # ❌ Eliminar - migración ya ejecutada
scripts/migrate-merchant-categories.sql    # ❌ Eliminar - SQL de migración aplicado
scripts/add-category-fk-constraint.sql     # ❌ Eliminar - constraint ya agregado
scripts/run-category-migration.js          # ❌ Eliminar - runner de migración obsoleto
scripts/run-category-migration.sh          # ❌ Eliminar - shell wrapper obsoleto
scripts/run-migration-simple.js            # ❌ Eliminar - runner simplificado obsoleto
```

### Categoría: Scripts de Copia de Datos (Tareas Puntuales)
```bash
scripts/copy-db-to-fdcdb_dc.ts            # ❌ Eliminar - copia puntual completada
scripts/copy-december-to-january.ts       # ❌ Eliminar - copia mensual específica
scripts/copy-december-to-january.sql      # ❌ Eliminar - SQL de copia mensual
scripts/run-copy-db.sh                    # ❌ Eliminar - wrapper de copia
scripts/run-copy-december-to-january.sh   # ❌ Eliminar - wrapper específico
scripts/run-copy-sql.sh                   # ❌ Eliminar - runner de SQL
```

### Categoría: Población de Categorías (Ya Completada)
```bash
scripts/populate-categories-direct.ts      # ❌ Eliminar - población directa completada
scripts/populate-categories-via-api.ts     # ❌ Eliminar - población vía API obsoleta
scripts/populate-categories.sh             # ❌ Eliminar - wrapper de población
scripts/populate-categories.sql            # ❌ Eliminar - SQL de población
scripts/backfill-categories.ts             # ❌ Eliminar - backfill de categorías hecho
```

### Categoría: Merchants Management (Tareas Iniciales)
```bash
scripts/add-missing-merchants-simple.ts    # ❌ Eliminar - población inicial completada
scripts/add-missing-merchants.ts           # ❌ Eliminar - población inicial completada
scripts/populate-merchants-simple.sh       # ❌ Eliminar - wrapper obsoleto
scripts/delete-zero-transaction-merchants.ts # ❌ Eliminar - limpieza puntual hecha
```

### Categoría: Fix y Limpieza Puntuales
```bash
scripts/fix-merchant-stats.ts              # ❌ Eliminar - corrección puntual aplicada
scripts/fix-merchant-stats.sh              # ❌ Eliminar - wrapper obsoleto
scripts/fix-merchant-stats.sql             # ❌ Eliminar - SQL de corrección aplicado
scripts/create-merchant-trigger.sql        # ❌ Eliminar - trigger ya creado
scripts/final-reprocess-banistmo.sql       # ❌ Eliminar - reproceso final hecho
```

### Categoría: Scripts de Inserción Manual
```bash
scripts/insert-monthly-final.ts            # ❌ Eliminar - inserción mensual específica
scripts/insert-monthly-transactions.sql    # ❌ Eliminar - SQL de inserción mensual
scripts/insert-via-dataconnect.ts          # ❌ Eliminar - test de dataconnect
scripts/run-insert-monthly.sh              # ❌ Eliminar - wrapper de inserción
scripts/run-insert-monthly-dc.sh           # ❌ Eliminar - wrapper dataconnect
```

### Categoría: Scripts de Población Now/Simple (Obsoletos)
```bash
scripts/populate-now.sh                    # ❌ Eliminar - población ad-hoc obsoleta
scripts/run-populate-monthly-simple.sh     # ❌ Eliminar - wrapper mensual obsoleto
scripts/run-populate-monthly-transactions.sh # ❌ Eliminar - wrapper obsoleto
```

### Categoría: Scripts de Generación y Test
```bash
scripts/generate-monthly-sql.ts            # ❌ Eliminar - generador de SQL puntual
scripts/query-manual-txns-simple.mjs       # ❌ Eliminar - query test obsoleto
scripts/test-all-manual-txns.mjs           # ❌ Eliminar - test manual obsoleto
scripts/test-fetch-manual-txns.mjs         # ❌ Eliminar - test fetch obsoleto
```

### Categoría: Scripts de Lista/Export
```bash
scripts/list-banistmo-to-reprocess.sh      # ❌ Eliminar - lista para reproceso puntual
scripts/export-banistmo-message-ids.sh     # ❌ Eliminar - export puntual completado
scripts/check-fdcdb-dc-simple.sh           # ❌ Eliminar - check de migración obsoleto
```

### Categoría: Verificaciones Específicas de Diciembre/Enero
```bash
scripts/verify-december-count.ts           # ❌ Eliminar - verificación mensual específica
scripts/verify-december-data.ts            # ❌ Eliminar - verificación mensual específica
scripts/verify-december-transactions.ts    # ❌ Eliminar - verificación mensual específica
scripts/verify-january-copy.sql            # ❌ Eliminar - SQL de verificación mensual
scripts/run-verify-january.sh              # ❌ Eliminar - wrapper de verificación
```

---

## ✅ Scripts que MANTENER (Herramientas Útiles)

### Scripts de Verificación General
```bash
scripts/check-last-transaction.ts          # ✅ MANTENER - útil para verificar último txn
scripts/verify-categories.ts               # ✅ MANTENER - verifica integridad de categorías
scripts/verify-merchant-stats.sql          # ✅ MANTENER - verifica stats de merchants
scripts/verify-manual-transactions.ts      # ✅ MANTENER - verifica txns manuales
scripts/verify-simple.ts                   # ✅ MANTENER - verificación general simple
scripts/verify-stats.ts                    # ✅ MANTENER - verifica estadísticas generales
```

### Scripts de Gestión
```bash
scripts/check-schema.sql                   # ✅ MANTENER - útil para verificar esquema
scripts/update-history-id.ts               # ✅ MANTENER - útil para actualizar history ID
scripts/check-duplicate-merchants.ts       # ✅ MANTENER - detecta duplicados
scripts/init-sync-state.sql                # ✅ MANTENER - útil para reiniciar sync state
scripts/enable-google-auth.sh              # ✅ MANTENER - configuración OAuth
```

### Documentación
```bash
scripts/MIGRATION_INSTRUCTIONS.md          # ✅ MANTENER - documentación histórica útil
```

---

## 🚀 Comandos de Limpieza

### Para eliminar TODOS los scripts redundantes de una vez:

```bash
cd scripts

# Eliminar scripts de backfill y población
rm -f populate-december-2025.ts populate-manual-transactions.ts populate-merchants.ts \
      populate-monthly-transactions.ts populate-via-ingestor.ts \
      reprocess-banistmo.ts reprocess-banistmo-v2.sh reprocess-banistmo.sh

# Eliminar migraciones
rm -f migrate-categories.ts migrate-merchant-categories.sql add-category-fk-constraint.sql \
      run-category-migration.js run-category-migration.sh run-migration-simple.js

# Eliminar scripts de copia
rm -f copy-db-to-fdcdb_dc.ts copy-december-to-january.ts copy-december-to-january.sql \
      run-copy-db.sh run-copy-december-to-january.sh run-copy-sql.sh

# Eliminar población de categorías
rm -f populate-categories-direct.ts populate-categories-via-api.ts populate-categories.sh \
      populate-categories.sql backfill-categories.ts

# Eliminar merchants management
rm -f add-missing-merchants-simple.ts add-missing-merchants.ts populate-merchants-simple.sh \
      delete-zero-transaction-merchants.ts

# Eliminar fix puntuales
rm -f fix-merchant-stats.ts fix-merchant-stats.sh fix-merchant-stats.sql \
      create-merchant-trigger.sql final-reprocess-banistmo.sql

# Eliminar inserción manual
rm -f insert-monthly-final.ts insert-monthly-transactions.sql insert-via-dataconnect.ts \
      run-insert-monthly.sh run-insert-monthly-dc.sh

# Eliminar población now/simple
rm -f populate-now.sh run-populate-monthly-simple.sh run-populate-monthly-transactions.sh

# Eliminar generación y tests
rm -f generate-monthly-sql.ts query-manual-txns-simple.mjs test-all-manual-txns.mjs \
      test-fetch-manual-txns.mjs

# Eliminar listas/exports
rm -f list-banistmo-to-reprocess.sh export-banistmo-message-ids.sh check-fdcdb-dc-simple.sh

# Eliminar verificaciones específicas
rm -f verify-december-count.ts verify-december-data.ts verify-december-transactions.ts \
      verify-january-copy.sql run-verify-january.sh

echo "✅ Limpieza completada - Solo quedan scripts de producción y herramientas útiles"
```

### Para verificar qué quedó:
```bash
ls -lh scripts/*.ts scripts/*.sh scripts/*.sql 2>/dev/null | wc -l
```

---

## 📝 Estructura Final Recomendada

Después de la limpieza, tu carpeta `scripts/` debería verse así:

```
scripts/
├── sync-emails-daily.ts              # ⭐ Script principal de producción
├── run-daily-sync.sh                 # ⭐ Wrapper para ejecutar el sync
├── check-last-transaction.ts         # Verificación útil
├── verify-categories.ts              # Verificación de categorías
├── verify-merchant-stats.sql         # Verificación de merchants
├── verify-manual-transactions.ts     # Verificación de txns
├── verify-simple.ts                  # Verificación simple
├── verify-stats.ts                   # Verificación de stats
├── check-schema.sql                  # Verificación de esquema
├── update-history-id.ts              # Actualización de history ID
├── check-duplicate-merchants.ts      # Detección de duplicados
├── init-sync-state.sql               # Init de sync state
├── enable-google-auth.sh             # Setup OAuth
├── MIGRATION_INSTRUCTIONS.md         # Documentación histórica
└── CLEANUP_GUIDE.md                  # ⭐ Esta guía
```

---

## 🎯 Resultado Esperado

**Antes:** ~70 archivos en `scripts/`
**Después:** ~15 archivos en `scripts/`

**Reducción:** ~80% menos archivos
**Beneficio:** Código más limpio, mantenible, y fácil de entender

---

## ⚡ Uso en Producción

### Ejecución Manual
```bash
./scripts/run-daily-sync.sh
```

### Cron Job (Ejemplo)
```bash
# Ejecutar diariamente a las 6 AM
0 6 * * * cd /path/to/personal-dashboard && ./scripts/run-daily-sync.sh >> /var/log/email-sync.log 2>&1
```

### Cloud Scheduler (GCP)
```bash
gcloud scheduler jobs create http daily-email-sync \
  --schedule="0 6 * * *" \
  --uri="https://your-cloud-run-url/sync" \
  --http-method=POST
```

---

## 📚 Referencias

- Script principal: `scripts/sync-emails-daily.ts`
- Documentación del proyecto: `README.md`
- Setup de infraestructura: `infra/gcloud/`
- Servicio de ingestor: `services/ingestor/`

---

**Última actualización:** 2026-01-17
