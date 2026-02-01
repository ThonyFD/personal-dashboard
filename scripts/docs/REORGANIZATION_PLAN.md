# 📁 Plan de Reorganización de Scripts

## 🎯 Problema Actual
- 73 archivos mezclados en una sola carpeta
- Difícil encontrar lo que necesitas
- Scripts obsoletos mezclados con scripts útiles
- Sin estructura clara

## 🏗️ Nueva Estructura Propuesta

```
scripts/
├── README.md                          # Índice principal
│
├── production/                        # Scripts de producción
│   ├── sync-emails-daily.ts          # ⭐ Script principal
│   └── run-daily-sync.sh             # Wrapper de ejecución
│
├── verification/                      # Scripts de verificación
│   ├── check-last-transaction.ts
│   ├── verify-categories.ts
│   ├── verify-manual-transactions.ts
│   ├── verify-simple.ts
│   └── verify-stats.ts
│
├── maintenance/                       # Herramientas de mantenimiento
│   ├── check-duplicate-merchants.ts
│   ├── update-history-id.ts
│   ├── enable-google-auth.sh
│   ├── check-schema.sql
│   ├── init-sync-state.sql
│   └── verify-merchant-stats.sql
│
├── docs/                             # Documentación de scripts
│   ├── README_DAILY_SYNC.md
│   ├── CLEANUP_GUIDE.md
│   ├── RESUMEN_CAMBIOS.md
│   ├── ANTES_Y_DESPUES.md
│   └── MIGRATION_INSTRUCTIONS.md
│
└── archive/                          # Scripts obsoletos (para referencia)
    ├── migrations/
    ├── backfill/
    ├── monthly-operations/
    └── one-time-fixes/
```

## 📊 Categorización de Archivos

### ✅ Mantener en Producción (2 archivos)
- sync-emails-daily.ts
- run-daily-sync.sh

### ✅ Mantener en Verification (5 archivos)
- check-last-transaction.ts
- verify-categories.ts
- verify-manual-transactions.ts
- verify-simple.ts
- verify-stats.ts

### ✅ Mantener en Maintenance (6 archivos)
- check-duplicate-merchants.ts
- update-history-id.ts
- enable-google-auth.sh
- check-schema.sql
- init-sync-state.sql
- verify-merchant-stats.sql

### ✅ Mantener en Docs (5 archivos)
- README_DAILY_SYNC.md
- CLEANUP_GUIDE.md
- RESUMEN_CAMBIOS.md
- ANTES_Y_DESPUES.md
- MIGRATION_INSTRUCTIONS.md

### 🗄️ Archivar (55 archivos obsoletos)
Todo lo demás → archive/

## 🚀 Beneficios

### Antes
```
scripts/
├── archivo1.ts
├── archivo2.sh
├── archivo3.sql
├── ... (70 archivos más)
```
❌ Caótico
❌ Difícil de navegar
❌ No se sabe qué está obsoleto

### Después
```
scripts/
├── README.md              ← Índice claro
├── production/            ← Scripts principales
├── verification/          ← Verificaciones
├── maintenance/           ← Herramientas
├── docs/                  ← Documentación
└── archive/              ← Obsoletos (opcional)
```
✅ Organizado
✅ Fácil de navegar
✅ Claro qué usar

## 📝 Plan de Ejecución

### Paso 1: Crear Estructura
```bash
cd scripts
mkdir -p production verification maintenance docs archive/{migrations,backfill,monthly-operations,one-time-fixes}
```

### Paso 2: Mover Scripts de Producción
```bash
mv sync-emails-daily.ts production/
mv run-daily-sync.sh production/
```

### Paso 3: Mover Scripts de Verificación
```bash
mv check-last-transaction.ts verification/
mv verify-categories.ts verification/
mv verify-manual-transactions.ts verification/
mv verify-simple.ts verification/
mv verify-stats.ts verification/
```

### Paso 4: Mover Mantenimiento
```bash
mv check-duplicate-merchants.ts maintenance/
mv update-history-id.ts maintenance/
mv enable-google-auth.sh maintenance/
mv check-schema.sql maintenance/
mv init-sync-state.sql maintenance/
mv verify-merchant-stats.sql maintenance/
```

### Paso 5: Mover Documentación
```bash
mv README_DAILY_SYNC.md docs/
mv CLEANUP_GUIDE.md docs/
mv RESUMEN_CAMBIOS.md docs/
mv ANTES_Y_DESPUES.md docs/
mv MIGRATION_INSTRUCTIONS.md docs/
```

### Paso 6: Archivar Obsoletos
```bash
# Migraciones
mv migrate-*.* archive/migrations/
mv *migration*.* archive/migrations/
mv add-category-fk-constraint.sql archive/migrations/

# Backfill
mv backfill-*.* archive/backfill/
mv populate-*.* archive/backfill/
mv reprocess-*.* archive/backfill/
mv add-missing-merchants*.* archive/backfill/

# Operaciones mensuales
mv *december*.* archive/monthly-operations/
mv *january*.* archive/monthly-operations/
mv *monthly*.* archive/monthly-operations/
mv insert-monthly*.* archive/monthly-operations/
mv generate-monthly*.* archive/monthly-operations/

# Fixes puntuales
mv fix-*.* archive/one-time-fixes/
mv delete-*.* archive/one-time-fixes/
mv copy-*.* archive/one-time-fixes/
mv final-*.* archive/one-time-fixes/
mv create-merchant-trigger.sql archive/one-time-fixes/

# Otros obsoletos
mv list-*.* archive/
mv export-*.* archive/
mv test-*.* archive/
mv check-fdcdb*.* archive/
mv query-*.* archive/
mv run-*.sh archive/
mv run-*.js archive/
mv diagnose-*.* archive/
```

### Paso 7: Crear README Principal
Crear `scripts/README.md` con índice de todos los scripts

## ✅ Resultado Final

```
scripts/
├── README.md                          # 📖 Índice principal
│
├── production/                        # 🚀 Scripts principales (2)
│   ├── sync-emails-daily.ts          # ⭐ Sincronización diaria
│   └── run-daily-sync.sh             # Wrapper conveniente
│
├── verification/                      # 🔍 Verificaciones (5)
│   ├── check-last-transaction.ts     # Ver último txn
│   ├── verify-categories.ts          # Verificar categorías
│   ├── verify-manual-transactions.ts # Verificar txns manuales
│   ├── verify-simple.ts              # Verificación simple
│   └── verify-stats.ts               # Verificar estadísticas
│
├── maintenance/                       # 🔧 Mantenimiento (6)
│   ├── check-duplicate-merchants.ts  # Detectar duplicados
│   ├── check-schema.sql              # Verificar esquema
│   ├── enable-google-auth.sh         # Setup OAuth
│   ├── init-sync-state.sql           # Init sync state
│   ├── update-history-id.ts          # Actualizar history ID
│   └── verify-merchant-stats.sql     # Stats de merchants
│
├── docs/                             # 📚 Documentación (5)
│   ├── README_DAILY_SYNC.md          # Guía del script principal
│   ├── CLEANUP_GUIDE.md              # Guía de limpieza
│   ├── RESUMEN_CAMBIOS.md            # Resumen de cambios
│   ├── ANTES_Y_DESPUES.md            # Comparación
│   └── MIGRATION_INSTRUCTIONS.md     # Instrucciones históricas
│
└── archive/                          # 🗄️ Obsoletos (55)
    ├── migrations/                    # Migraciones completadas
    ├── backfill/                      # Scripts de backfill
    ├── monthly-operations/            # Operaciones mensuales
    └── one-time-fixes/               # Fixes puntuales
```

**Total:** 18 archivos activos + 55 archivados = 73 archivos

## 📖 Nuevo README.md

El archivo `scripts/README.md` será el índice principal con:
- Descripción de cada categoría
- Lista de scripts con su propósito
- Comandos de ejemplo
- Enlaces a documentación

## 🎉 Beneficios Finales

1. **Fácil navegación** - Sabes exactamente dónde buscar
2. **Claridad** - Scripts activos vs obsoletos
3. **Documentación** - README explica todo
4. **Mantenibilidad** - Fácil agregar nuevos scripts
5. **Profesional** - Estructura estándar de la industria
