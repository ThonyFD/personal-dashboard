# Scripts

Scripts activos del proyecto. Todo lo que no describe el flujo actual ya fue removido del repo.

## Estructura

```text
scripts/
├── production/
├── maintenance/
├── verification/
└── docs/
```

## Production

| Script | Uso |
|--------|-----|
| `production/renew-gmail-watch.ts` | renueva el watch de Gmail |
| `production/sync-emails-daily.ts` | sync defensivo Gmail -> Supabase |
| `production/send-notifications.ts` | envía recordatorios push |
| `production/run-daily-sync.sh` | wrapper local para el sync |

Ejecutar sync manual:

```bash
./scripts/production/run-daily-sync.sh
```

## Maintenance

| Script | Uso |
|--------|-----|
| `maintenance/check-duplicate-merchants.ts` | detecta merchants duplicados |
| `maintenance/update-history-id.ts` | actualiza el último Gmail history ID |
| `maintenance/enable-google-auth.sh` | ayuda con OAuth local |
| `maintenance/check-schema.sql` | inspección del esquema |
| `maintenance/init-sync-state.sql` | reinicializar estado de sync |
| `maintenance/verify-merchant-stats.sql` | validar agregados de merchants |

## Verification

| Script | Uso |
|--------|-----|
| `verification/verify-stats.ts` | muestra estadísticas básicas de emails y transacciones |

## Docs

| Documento | Uso |
|----------|-----|
| `docs/README_DAILY_SYNC.md` | guía del sync manual y automático |

## Operación típica

1. Renovar Gmail watch desde workflow o manualmente.
2. Ejecutar `sync-emails-daily.ts` cuando quieras forzar un sync.
3. Validar con `verification/verify-stats.ts`.
4. Corregir datos puntuales con scripts de `maintenance/`.

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
