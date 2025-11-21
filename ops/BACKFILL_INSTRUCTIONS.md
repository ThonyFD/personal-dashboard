# Historical Email Backfill Guide

Este script te permite cargar correos financieros históricos (últimos 2 años) en tu base de datos.

## Requisitos Previos

1. **Token OAuth ya generado**: El archivo `ops/token.json` debe existir
   - Si no lo tienes, ejecuta primero: `cd ops && node get-oauth-token.js`

2. **Base de datos configurada**: Firebase Data Connect debe estar activo
   - El script usa el mismo cliente de DB que el ingestor

3. **Etiqueta Gmail configurada**: Tus correos financieros deben tener la etiqueta `financial`

## Cómo Usar

### Paso 1: Preparar el Entorno

```bash
# Desde la raíz del proyecto
cd /Users/thonyfd/projects/personal-dashboard

# Asegúrate de que las dependencias del ingestor estén instaladas
cd services/ingestor
npm install
cd ../..
```

### Paso 2: Verificar Credenciales

```bash
# Verifica que token.json existe
ls ops/token.json

# Si no existe, genera el token
cd ops
node get-oauth-token.js
cd ..
```

### Paso 3: Ejecutar el Backfill

```bash
# Desde la raíz del proyecto
tsx ops/backfill-historical.ts
```

### Paso 4: Monitorear el Progreso

El script mostrará:
- ✅ Cuántos correos se encontraron
- 📊 Progreso en tiempo real cada 10 correos
- 📈 Tasa de procesamiento (mensajes/segundo)
- ⏱️ Tiempo estimado restante

Ejemplo de salida:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Historical Email Backfill
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 Initializing OAuth authentication...
✅ Authentication successful

📬 Fetching message IDs from Gmail...
   Query: label:financial after:2023/01/01

   Fetched page 1: 100 messages (total: 100)
   Fetched page 2: 100 messages (total: 200)
   ...

✅ Found 2000 financial emails

🚀 Starting message processing...
   Total to process: 2000
   Rate limit: ~10 messages/sec
   Estimated time: ~3 minutes

📊 Progress: 100/2000 (5%)
   Processed: 100 | Failed: 0 | Skipped: 0
   Rate: 9.8 msg/sec
   ETA: 3m 12s
```

## Características del Script

### 1. Checkpoint Automático
- **Archivo**: `ops/.backfill-checkpoint.json`
- **Función**: Guarda progreso cada 10 correos
- **Beneficio**: Si se interrumpe (Ctrl+C, error, etc.), puedes continuar donde quedaste

```bash
# Si el script se interrumpe, solo vuelve a ejecutarlo
tsx ops/backfill-historical.ts
# Detectará el checkpoint y continuará desde donde quedó
```

### 2. Rate Limiting
- **Velocidad**: ~10 mensajes/segundo (conservador)
- **Por qué**: Gmail API tiene límite de 250 unidades/segundo
- **Ajustar**: Modifica `RATE_LIMIT_DELAY_MS` en el script si quieres ir más rápido

### 3. Manejo de Errores
- Los correos que fallan al parsear **NO** detienen el script
- Se registran en los logs y continúa con el siguiente
- Al final verás un resumen de errores

### 4. Reutilización de Código
- Usa el mismo `IngestionHandler` que el servicio Cloud Run
- Misma lógica de parsing (BAC, Clave, Yappy)
- Misma validación de duplicados (idempotency key)

## Estimaciones de Tiempo

| Correos | Tiempo Aproximado |
|---------|-------------------|
| 500     | ~1 minuto         |
| 1,000   | ~2 minutos        |
| 2,000   | ~3-4 minutos      |
| 5,000   | ~8-10 minutos     |

## Uso de Cuota de Gmail API

Cada correo consume:
- **1 unidad** para `messages.list` (solo la primera vez)
- **5 unidades** para `messages.get` (fetch del correo completo)

Ejemplo para 2,000 correos:
- Total: ~10,020 unidades
- Límite diario: 1,000,000,000 unidades
- **Usas el 0.001% del límite** ✅

## Solución de Problemas

### Error: "token.json not found"
```bash
cd ops
node get-oauth-token.js
# Sigue las instrucciones para generar el token
```

### Error: "Gmail client not initialized"
Verifica que las credenciales en Secret Manager estén correctas:
```bash
~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-client-id
~/google-cloud-sdk/bin/gcloud secrets versions access latest --secret=gmail-oauth-refresh-token
```

### Error: "Database connection failed"
Verifica que Firebase Data Connect esté activo:
```bash
cd dataconnect
firebase dataconnect:sql:shell
# Debe conectarse exitosamente
```

### El script va muy lento
Puedes acelerar el rate limit (usa con cuidado):
```typescript
// En backfill-historical.ts, línea ~30
const RATE_LIMIT_DELAY_MS = 50; // Cambia de 100ms a 50ms = 20 msg/sec
```

### Quiero reiniciar desde cero
```bash
# Borra el checkpoint
rm ops/.backfill-checkpoint.json

# Ejecuta de nuevo
tsx ops/backfill-historical.ts
```

## Verificar Resultados

Después de ejecutar el script, verifica que los datos se guardaron:

```bash
# Conecta a la base de datos
cd dataconnect
firebase dataconnect:sql:shell

# Cuenta cuántos emails se insertaron
SELECT COUNT(*) FROM emails WHERE provider IN ('bac', 'clave', 'yappy');

# Cuenta cuántas transacciones
SELECT COUNT(*) FROM transactions;

# Ve las últimas 10 transacciones
SELECT
  txn_date,
  merchant_name,
  amount,
  provider
FROM transactions
ORDER BY txn_date DESC
LIMIT 10;
```

## Ejecución Nocturna (Opcional)

Si tienes muchos correos y quieres dejarlo corriendo por la noche:

```bash
# Redirige la salida a un archivo log
nohup tsx ops/backfill-historical.ts > backfill.log 2>&1 &

# Monitorea el progreso
tail -f backfill.log

# Para detener
pkill -f backfill-historical
```

## Preguntas Frecuentes

**P: ¿Se van a duplicar los correos que ya procesó el ingestor en tiempo real?**
R: No, la lógica de `idempotency_key` previene duplicados. Si un correo ya existe, se ignora.

**P: ¿Puedo cambiar el rango de fechas?**
R: Sí, modifica `LOOKBACK_YEARS` en el script (línea ~29):
```typescript
const LOOKBACK_YEARS = 3; // Para 3 años en vez de 2
```

**P: ¿Puedo usar una query diferente?**
R: Sí, modifica el método `getDateQuery()` (línea ~111):
```typescript
// Ejemplo: Solo correos de BAC
return `from:notificaciones@bac.net after:2023/01/01`;
```

**P: ¿El script maneja renovación automática del access token?**
R: Sí, usa el mismo `OAuthTokenManager` que el ingestor, que renueva automáticamente el token.

## Limpieza Post-Backfill

Una vez completado exitosamente:

```bash
# El checkpoint se borra automáticamente al terminar
# Pero si quieres borrar todo manualmente:
rm ops/.backfill-checkpoint.json
rm ops/token.json  # Solo si no lo necesitas más
```

---

## Soporte

Si encuentras problemas:
1. Revisa los logs del script
2. Verifica los logs de Cloud Run del ingestor para ver si hay errores de DB
3. Revisa esta guía de solución de problemas

¡Listo para cargar tus datos históricos! 🚀
