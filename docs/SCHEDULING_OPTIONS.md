# ⏰ Opciones para Agendar el Script Diario

## 🎯 Resumen Ejecutivo

**Opción Recomendada: GitHub Actions** ✨

| Opción | Dificultad | Costo | Confiabilidad | Recomendado |
|--------|------------|-------|---------------|-------------|
| **🥇 GitHub Actions** | Media | **Gratis** | ⭐⭐⭐⭐⭐ | **✅ Mejor opción** |
| Render.com | Fácil | Gratis* | ⭐⭐⭐⭐ | Alternativa |
| Mejorar GCP | Difícil | $0.10/mes | ⭐⭐⭐ | Si ya tienes GCP |
| Mac Local | Muy fácil | Gratis | ⭐⭐ | Testing solamente |

---

## 🥇 Opción 1: GitHub Actions (RECOMENDADO)

### ✅ Ventajas
- ✅ **100% gratis** (2,000 min/mes en repos privados)
- ✅ **Muy confiable** - infraestructura de Microsoft
- ✅ **Logs excelentes** en la UI
- ✅ **Notificaciones automáticas** por email si falla
- ✅ **Ejecución manual** desde GitHub UI
- ✅ **Ya tienes el código en GitHub** probablemente
- ✅ **Serverless** - no requiere servidor corriendo

### ❌ Desventajas
- ⚠️ Setup inicial un poco técnico (30 min)
- ⚠️ Requiere configurar Workload Identity en GCP

### 📚 Documentación
- **Ver guía completa:** `docs/DAILY_SYNC_SETUP.md`
- **Workflow:** `.github/workflows/daily-email-sync.yml` (ya creado)

### ⚡ Quick Start
```bash
# 1. Configurar Workload Identity en GCP (seguir guía)
# 2. Agregar secrets en GitHub
# 3. Push del workflow
git add .github/workflows/daily-email-sync.yml
git commit -m "Add GitHub Actions workflow"
git push origin main
```

---

## 🥈 Opción 2: Render.com (Alternativa Gratis)

### ✅ Ventajas
- ✅ **Gratis** con limitaciones razonables
- ✅ **Fácil** similar a Railway
- ✅ **Cron jobs** en plan gratuito
- ✅ **No requiere tarjeta** de crédito

### ❌ Desventajas
- ⚠️ Tier gratis tiene "cold starts" (delays)
- ⚠️ 90 segundos de límite por ejecución (puede ser justo)

### 📚 Setup
```bash
# 1. Crear cuenta en render.com
# 2. New → Cron Job
# 3. Conectar GitHub repo
# 4. Command: npx tsx scripts/sync-emails-daily.ts
# 5. Schedule: 0 11 * * *
# 6. Agregar variables de entorno
```

---

## 🛠️ Opción 3: Mejorar tu GCP Existente

### ¿Por qué falla tu GCP?

Posibles razones:
1. **OAuth tokens expiran** → Necesitas renovación automática
2. **Cloud Run se apaga** → Necesitas min-instances=1
3. **Pub/Sub no llega** → Necesitas polling de respaldo
4. **Memoria insuficiente** → Aumentar a 512MB

### Solución: Sistema Híbrido (ya lo tienes)

Tu proyecto ya tiene un **sistema híbrido** con:
- ✅ Push notifications (Pub/Sub)
- ✅ Polling de respaldo (cada hora)
- ✅ Health monitoring
- ✅ Token renewal automático

**Problema probable:** Necesitas configurar `min-instances=1` en Cloud Run

### Fix Rápido
```bash
# Configurar min-instances para que nunca se apague
gcloud run services update ingestor \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=10

# Esto costará ~$5-10/mes pero será 100% confiable
```

---

## 💻 Opción 4: Mac Local (Solo para Testing)

### Setup
```bash
# Editar crontab
crontab -e

# Agregar línea (6 AM diario)
0 6 * * * cd /path/to/personal-dashboard && ./scripts/run-daily-sync.sh >> ~/email-sync.log 2>&1
```

### ❌ Desventajas
- ⚠️ Solo funciona si la Mac está encendida
- ⚠️ No hay notificaciones si falla
- ⚠️ Difícil debuggear

**No recomendado para producción**

---

## 🎯 Mi Recomendación Final

### Para ti, recomiendo en este orden:

#### 1️⃣ **GitHub Actions** (Opción principal) ✨
**Por qué:**
- Gratis para siempre
- Muy confiable
- Ya tienes el código en GitHub
- Excelentes logs
- Notificaciones automáticas

**Costo total:** $0/mes
**Setup time:** 30 minutos
**Ver:** `docs/DAILY_SYNC_SETUP.md`

#### 2️⃣ **Render.com** (si quieres algo más simple)
**Por qué:**
- Gratis (con limitaciones)
- Fácil de usar
- No requiere tarjeta de crédito

**Costo total:** $0/mes
**Setup time:** 10 minutos

#### 3️⃣ **Mejorar GCP** (si ya tienes todo ahí)
**Por qué:**
- Ya tienes la infraestructura
- Solo necesitas ajustar min-instances

**Costo total:** $5-10/mes
**Setup time:** 5 minutos

---

## 📊 Comparación Detallada

### Confiabilidad
```
GitHub Actions:  ██████████ 10/10
Render:          ████████░░  8/10
GCP mejorado:    ███████░░░  7/10
Mac local:       ████░░░░░░  4/10
```

### Facilidad de Setup
```
Render:          ████████░░  8/10
Mac local:       ███████░░░  7/10
GitHub Actions:  ██████░░░░  6/10
GCP mejorado:    ████░░░░░░  4/10
```

### Costo (menor es mejor)
```
GitHub Actions:  ██████████ 10/10 (gratis)
Render:          ██████████ 10/10 (gratis)
GCP mejorado:    ████░░░░░░  4/10 ($5-10)
Mac local:       ██████████ 10/10 (gratis)
```

### Logs & Debugging
```
GitHub Actions:  ██████████ 10/10
GCP mejorado:    ████████░░  8/10
Render:          ███████░░░  7/10
Mac local:       ████░░░░░░  4/10
```

---

## 🚀 Decisión Rápida

### ✅ Mejor opción general
→ **GitHub Actions** - Gratis + Confiable + Excelentes logs

### ⚡ Opción más simple
→ **Render.com** - Fácil setup + Gratis (con limitaciones)

### 🔧 Si ya tienes GCP
→ **Mejorar GCP** (min-instances=1)

### 🧪 Solo para probar
→ **Mac local** (temporal)

---

## 📞 Próximos Pasos

1. **Opción recomendada:** GitHub Actions ⭐
2. **Sigue la guía paso a paso:** `docs/DAILY_SYNC_SETUP.md`
3. **Tiempo estimado:** 30 minutos
4. **Costo:** $0/mes
5. **Prueba manualmente** primero desde GitHub UI
6. **Verifica logs** que funcione correctamente

---

## ✅ Checklist de Decisión

- [ ] ¿Tienes el código en GitHub? → **GitHub Actions** ✅
- [ ] ¿Quieres el setup MÁS fácil? → Render.com
- [ ] ¿Necesitas que sea 100% gratis? → **GitHub Actions** o Render ✅
- [ ] ¿Ya tienes infraestructura en GCP? → Mejorar GCP
- [ ] ¿Solo quieres probar? → Mac local

---

**Última actualización:** 2026-01-17
**Recomendación principal:** GitHub Actions (gratis + confiable + logs excelentes)
