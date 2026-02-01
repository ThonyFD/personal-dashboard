# 🔧 Solución a Duplicados de Merchants

## 🐛 Problema Identificado

Se encontraron **3 problemas** que causan duplicados de merchants:

### 1. Query incorrecta (CRÍTICO)
**Archivo:** `dataconnect/connector/queries.gql` línea 200

**Problema:**
```gql
query GetMerchantByName($name: String!) @auth(level: PUBLIC) {
  merchants(where: { name: { eq: $name } }, limit: 1) {  // ❌ Busca por 'name'
```

**Solución:**
```gql
query GetMerchantByName($name: String!) @auth(level: PUBLIC) {
  merchants(where: { normalizedName: { eq: $name } }, limit: 1) {  // ✅ Buscar por 'normalizedName'
```

### 2. Normalización débil
**Archivo:** `services/ingestor/src/utils/hash.ts`

**Problema:**
```typescript
export function simpleNormalizeMerchantName(name: string): string {
  return name.toLowerCase().trim();  // ❌ Muy simple
}
```

Esto NO detecta duplicados como:
- "Amazon" vs "Amazon."
- "Super 99" vs "Super-99"
- "McDonald's" vs "McDonalds"

**Solución:** Usar `normalizeMerchantName` más robusta:
```typescript
export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales
    .replace(/\s+/g, ' ')         // Normaliza espacios
    .trim();
}
```

### 3. Merchants duplicados ya existentes
Necesitas limpiar los duplicados que ya tienes en la BD.

---

## ✅ Soluciones

### Paso 1: Corregir la Query (CRÍTICO)

Edita `dataconnect/connector/queries.gql`:

```gql
# Get merchant by name
query GetMerchantByName($name: String!) @auth(level: PUBLIC) {
  merchants(where: { normalizedName: { eq: $name } }, limit: 1) {
    id
    name
    normalizedName
    categoryId
    categoryRef {
      id
      name
      icon
      color
    }
    transactionCount
    totalAmount
  }
}
```

Luego regenera el SDK:
```bash
cd dataconnect
firebase dataconnect:sdk:generate
```

### Paso 2: Actualizar Script para Usar Normalización Robusta

Edita `scripts/production/sync-emails-daily.ts` línea 435:

**Antes:**
```typescript
normalizedName: simpleNormalizeMerchantName(transaction.merchant),
```

**Después:**
```typescript
normalizedName: normalizeMerchantName(transaction.merchant),
```

También necesitas importar la función correcta:

**Antes:**
```typescript
import {
  generateEmailBodyHash,
  generateIdempotencyKey,
  simpleNormalizeMerchantName  // ❌ Cambiar esto
} from '../services/ingestor/src/utils/hash';
```

**Después:**
```typescript
import {
  generateEmailBodyHash,
  generateIdempotencyKey,
  normalizeMerchantName  // ✅ Usar esta
} from '../../services/ingestor/src/utils/hash';
```

### Paso 3: Actualizar el Servicio Ingestor

Edita `services/ingestor/src/handler.ts` línea 218:

**Antes:**
```typescript
normalizedName: simpleNormalizeMerchantName(transaction.merchant),
```

**Después:**
```typescript
normalizedName: normalizeMerchantName(transaction.merchant),
```

También actualiza el import en ese archivo:

**Antes:**
```typescript
import { generateEmailBodyHash, generateIdempotencyKey, simpleNormalizeMerchantName } from './utils/hash.js';
```

**Después:**
```typescript
import { generateEmailBodyHash, generateIdempotencyKey, normalizeMerchantName } from './utils/hash.js';
```

### Paso 4: Limpiar Duplicados Existentes

**IMPORTANTE:** Ejecuta este script para consolidar merchants duplicados.

Ver: `scripts/maintenance/consolidate-duplicate-merchants.ts` (próximamente)

---

## 🎯 Resultado Esperado

Después de aplicar estas correcciones:

✅ Los nuevos merchants se buscarán correctamente por `normalizedName`
✅ La normalización eliminará caracteres especiales (., -, ', etc.)
✅ No se crearán nuevos duplicados
✅ Los duplicados existentes se pueden consolidar

---

## 🔍 Verificar el Problema Actual

```bash
# Ver duplicados actuales
npx tsx scripts/maintenance/check-duplicate-merchants.ts
```

---

## 📋 Checklist de Corrección

- [ ] Editar `dataconnect/connector/queries.gql` (línea 200)
- [ ] Regenerar SDK: `firebase dataconnect:sdk:generate`
- [ ] Editar `scripts/production/sync-emails-daily.ts` (import + línea 435)
- [ ] Editar `services/ingestor/src/handler.ts` (import + línea 218)
- [ ] Probar con un sync manual
- [ ] Ejecutar script de consolidación de duplicados

---

## ⚠️ IMPORTANTE

**NO ejecutes el sync diario** hasta aplicar estas correcciones, o seguirás creando duplicados.

**Prioridad:**
1. Corregir query (CRÍTICO)
2. Regenerar SDK
3. Actualizar scripts
4. Probar
5. Limpiar duplicados existentes

---

**Fecha:** 2026-01-17
**Estado:** Pendiente de aplicar
