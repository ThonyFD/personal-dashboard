# Daily Sync

Guía rápida del sync defensivo Gmail -> Supabase.

## Script principal

- `scripts/production/sync-emails-daily.ts`
- wrapper local: `scripts/production/run-daily-sync.sh`
- workflow: `.github/workflows/daily-email-sync.yml`

## Variables requeridas

```bash
export GOOGLE_CLOUD_PROJECT="mail-reader-433802"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Opcional:

```bash
export LOOKBACK_DAYS=7
```

## Ejecutar manualmente

```bash
./scripts/production/run-daily-sync.sh
```

O directo:

```bash
npx tsx scripts/production/sync-emails-daily.ts
```

## Qué hace

- calcula la ventana de sync según el último email persistido
- consulta Gmail con la etiqueta `financial`
- reutiliza la lógica de parsing del ingestor
- inserta datos de forma idempotente

## Validación rápida

```bash
npx tsx scripts/verification/verify-stats.ts
```

## Troubleshooting

### No encuentra secretos

- revisa permisos sobre Secret Manager
- revisa `GOOGLE_CLOUD_PROJECT`

### Falla la base

- revisa `SUPABASE_URL`
- revisa `SUPABASE_SERVICE_ROLE_KEY`

### No aparecen emails nuevos

- revisa que el label `financial` exista
- revisa el Gmail watch y el workflow de renovación
