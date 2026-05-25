# Historical Email Backfill

Carga correos financieros históricos usando el mismo pipeline del ingestor y guardando en Supabase.

## Requisitos

1. Credenciales OAuth de Gmail ya cargadas en Secret Manager:
   - `gmail-oauth-client-id`
   - `gmail-oauth-client-secret`
   - `gmail-oauth-refresh-token`
2. Application Default Credentials listas para leer secretos:

```bash
gcloud auth application-default login
```

3. Variables de entorno para Supabase:

```bash
export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

4. Los correos a procesar deben tener la etiqueta `financial`.

## Ejecutar

```bash
cd /Users/thonyfd/projects/personal-dashboard
npm install
npx tsx ops/backfill-historical.ts
```

## Qué hace

- lista correos históricos de Gmail
- procesa cada mensaje con los mismos parsers del ingestor
- inserta emails y transacciones de forma idempotente
- guarda progreso en `ops/.backfill-checkpoint.json`

## Reiniciar o resumir

Si el proceso se interrumpe, vuelve a correr el mismo comando y retomará desde el checkpoint.

Para empezar desde cero:

```bash
rm ops/.backfill-checkpoint.json
npx tsx ops/backfill-historical.ts
```

## Verificación

Puedes validar resultados con Supabase SQL Editor o con `psql`:

```sql
select count(*) from emails;
select count(*) from transactions;

select txn_date, merchant_name, amount, provider
from transactions
order by created_at desc
limit 10;
```

## Problemas comunes

### No puede leer secretos

- confirma `gcloud auth application-default login`
- confirma permisos sobre Secret Manager

### Falla conexión a la base

- revisa `SUPABASE_URL`
- revisa `SUPABASE_SERVICE_ROLE_KEY`

### Quieres cambiar el rango histórico

Ajusta `LOOKBACK_YEARS` en [ops/backfill-historical.ts](/Users/thonyfd/projects/personal-dashboard/ops/backfill-historical.ts).

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
