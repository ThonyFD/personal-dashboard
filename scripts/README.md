# 📁 Scripts - Personal Dashboard

Colección organizada de scripts para gestión del proyecto.

---

## 📂 Estructura

```
scripts/
├── production/          # 🚀 Scripts de producción (2)
├── verification/        # 🔍 Scripts de verificación (5)
├── maintenance/         # 🔧 Herramientas de mantenimiento (6)
├── docs/               # 📚 Documentación (6)
└── archive/            # 🗄️ Scripts obsoletos (archivados)
```

---

## 🚀 Production

Scripts principales para operaciones de producción.

| Script | Descripción | Uso |
|--------|-------------|-----|
| **sync-emails-daily.ts** | ⭐ Script principal de sincronización diaria | `npx tsx production/sync-emails-daily.ts` |
| **run-daily-sync.sh** | Wrapper conveniente para ejecutar el sync | `./production/run-daily-sync.sh` |

### Quick Start
```bash
# Ejecutar sincronización diaria
./production/run-daily-sync.sh

# O directamente
cd production
npx tsx sync-emails-daily.ts
```

### Documentación
Ver: `docs/README_DAILY_SYNC.md`

---

## 🔍 Verification

Scripts para verificar el estado de la base de datos y transacciones.

| Script | Descripción | Uso |
|--------|-------------|-----|
| **check-last-transaction.ts** | Muestra la última transacción procesada | `npx tsx verification/check-last-transaction.ts` |
| **verify-categories.ts** | Verifica integridad de categorías | `npx tsx verification/verify-categories.ts` |
| **verify-manual-transactions.ts** | Verifica transacciones manuales | `npx tsx verification/verify-manual-transactions.ts` |
| **verify-simple.ts** | Verificación simple y rápida | `npx tsx verification/verify-simple.ts` |
| **verify-stats.ts** | Verifica estadísticas generales | `npx tsx verification/verify-stats.ts` |

### Ejemplos
```bash
# Ver último email/transacción procesado
npx tsx verification/check-last-transaction.ts

# Verificación rápida del sistema
npx tsx verification/verify-simple.ts

# Verificar estadísticas
npx tsx verification/verify-stats.ts
```

---

## 🔧 Maintenance

Herramientas de mantenimiento y administración.

| Script | Descripción | Uso |
|--------|-------------|-----|
| **check-duplicate-merchants.ts** | Detecta merchants duplicados | `npx tsx maintenance/check-duplicate-merchants.ts` |
| **update-history-id.ts** | Actualiza el Gmail history ID | `npx tsx maintenance/update-history-id.ts` |
| **enable-google-auth.sh** | Configura OAuth de Google | `./maintenance/enable-google-auth.sh` |
| **check-schema.sql** | Verifica esquema de la base de datos | SQL query |
| **init-sync-state.sql** | Inicializa el estado de sincronización | SQL query |
| **verify-merchant-stats.sql** | Verifica estadísticas de merchants | SQL query |

### Ejemplos
```bash
# Detectar merchants duplicados
npx tsx maintenance/check-duplicate-merchants.ts

# Actualizar history ID manualmente
npx tsx maintenance/update-history-id.ts

# Setup de OAuth
./maintenance/enable-google-auth.sh
```

---

## 📚 Documentation

Documentación completa del proyecto.

| Documento | Descripción |
|-----------|-------------|
| **README_DAILY_SYNC.md** | Guía completa del script de sincronización diaria |
| **CLEANUP_GUIDE.md** | Guía de limpieza de scripts obsoletos |
| **RESUMEN_CAMBIOS.md** | Resumen ejecutivo de todos los cambios |
| **ANTES_Y_DESPUES.md** | Comparación visual antes/después |
| **MIGRATION_INSTRUCTIONS.md** | Instrucciones históricas de migraciones |
| **REORGANIZATION_PLAN.md** | Plan de reorganización de carpetas |

### Lectura Recomendada
```bash
# Para entender el script principal
cat docs/README_DAILY_SYNC.md

# Para ver el resumen de cambios
cat docs/RESUMEN_CAMBIOS.md

# Para entender la reorganización
cat docs/REORGANIZATION_PLAN.md
```

---

## 🗄️ Archive

Scripts obsoletos que ya no se usan en producción pero se mantienen para referencia histórica.

**Contenido:**
- `migrations/` - Migraciones de base de datos ya ejecutadas
- `backfill/` - Scripts de backfill históricos
- `monthly-operations/` - Operaciones mensuales puntuales
- `one-time-fixes/` - Correcciones puntuales ya aplicadas

> **Nota:** Esta carpeta está en `.gitignore` y no se sincroniza con el repositorio.

---

## 🎯 Casos de Uso Comunes

### 1. Sincronizar Correos Manualmente
```bash
./production/run-daily-sync.sh
```

### 2. Verificar Último Email Procesado
```bash
npx tsx verification/check-last-transaction.ts
```

### 3. Verificar Estado del Sistema
```bash
npx tsx verification/verify-simple.ts
```

### 4. Detectar Problemas
```bash
# Verificar duplicados
npx tsx maintenance/check-duplicate-merchants.ts

# Verificar categorías
npx tsx verification/verify-categories.ts

# Verificar estadísticas
npx tsx verification/verify-stats.ts
```

---

## 🚀 Automatización

### GitHub Actions (Recomendado)
El script principal está configurado para ejecutarse automáticamente con GitHub Actions.

**Ver:** `docs/DAILY_SYNC_SETUP.md` para instrucciones completas.

**Workflow:** `.github/workflows/daily-email-sync.yml`

**Horario:** Diario a las 6:00 AM (Panama)

---

## 📊 Estadísticas

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Production | 2 | ✅ Activos |
| Verification | 5 | ✅ Activos |
| Maintenance | 6 | ✅ Activos |
| Documentation | 6 | ✅ Actualizado |
| Archive | ~55 | 🗄️ Archivados |
| **Total** | **74** | **Organizado** |

---

## 🔄 Flujo de Trabajo Típico

### Sincronización Diaria
1. GitHub Actions ejecuta automáticamente (6 AM)
2. O ejecutar manualmente: `./production/run-daily-sync.sh`
3. Verificar resultados: `npx tsx verification/check-last-transaction.ts`

### Verificación Manual
1. Ejecutar verificación simple: `npx tsx verification/verify-simple.ts`
2. Si hay problemas, usar scripts específicos de verification/
3. Para mantenimiento, usar scripts de maintenance/

### Debugging
1. Revisar logs de GitHub Actions
2. Ejecutar verificaciones: `verification/`
3. Consultar documentación: `docs/`

---

## 📞 Soporte

- **Script principal:** `production/sync-emails-daily.ts`
- **Documentación:** `docs/README_DAILY_SYNC.md`
- **Setup automatización:** `docs/DAILY_SYNC_SETUP.md` (en carpeta `docs/` del proyecto)
- **Comparación opciones:** `docs/SCHEDULING_OPTIONS.md` (en carpeta `docs/` del proyecto)

---

## ✨ Mejoras Recientes

- ✅ Reorganización completa de scripts (2026-01-17)
- ✅ Creación de script único de producción
- ✅ Consolidación de 70+ scripts dispersos
- ✅ Documentación completa
- ✅ Archivado de scripts obsoletos

---

**Última actualización:** 2026-01-17
**Versión:** 2.0.0
**Estado:** ✅ Organizado y listo para producción
