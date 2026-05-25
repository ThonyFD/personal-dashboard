-- ============================================================
-- DIAGNÓSTICO Y LIMPIEZA DE TRANSACCIONES DUPLICADAS
-- ============================================================
-- Ejecutar las secciones en orden. Sección 1 es solo lectura,
-- las secciones 2 y 3 modifican datos — revisar primero.
-- ============================================================


-- ============================================================
-- SECCIÓN 1: DIAGNÓSTICO (solo lectura, sin riesgo)
-- ============================================================

-- 1a. Duplicados por clave de negocio (date + amount + merchant + card)
--     Si idempotency_key no retorna filas, los duplicados vienen de
--     emails DISTINTOS — el banco envió N emails con la misma info.
SELECT
  txn_date,
  amount,
  merchant_name,
  card_last4,
  provider,
  COUNT(*)                   AS duplicate_count,
  MIN(id)                    AS keep_id,
  array_agg(id ORDER BY id)  AS all_ids,
  array_agg(email_id ORDER BY id) AS email_ids,
  array_agg(idempotency_key ORDER BY id) AS idempotency_keys
FROM transactions
GROUP BY txn_date, amount, merchant_name, card_last4, provider
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 1b. Ver los emails asociados a esos duplicados:
--     ¿Son el mismo gmail_message_id o distintos?
SELECT
  t.id          AS txn_id,
  t.email_id,
  t.amount,
  t.merchant_name,
  t.txn_date,
  t.idempotency_key,
  e.gmail_message_id,
  e.subject,
  e.received_at
FROM transactions t
JOIN emails e ON e.id = t.email_id
WHERE (t.txn_date, t.amount, t.merchant_name, t.card_last4, t.provider) IN (
  SELECT txn_date, amount, merchant_name, card_last4, provider
  FROM transactions
  GROUP BY txn_date, amount, merchant_name, card_last4, provider
  HAVING COUNT(*) > 1
)
ORDER BY t.merchant_name, t.txn_date, t.amount, t.id;

-- 1c. Conteo global: cuántas filas son duplicadas por clave de negocio
SELECT
  SUM(cnt - 1)  AS rows_to_delete,
  SUM(cnt)      AS total_duplicate_rows,
  COUNT(*)      AS unique_combinations
FROM (
  SELECT COUNT(*) AS cnt
  FROM transactions
  GROUP BY txn_date, amount, merchant_name, card_last4, provider
  HAVING COUNT(*) > 1
) sub;


-- ============================================================
-- SECCIÓN 2: LIMPIEZA (elimina duplicados, conserva el más antiguo)
-- ============================================================
-- Agrupa por clave de negocio (date + amount + merchant + card + provider)
-- y conserva el id más bajo de cada grupo.

BEGIN;

  -- Vista previa de lo que se va a eliminar
  SELECT id, email_id, txn_date, amount, merchant_name, idempotency_key
  FROM transactions
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM transactions
    GROUP BY txn_date, amount, merchant_name, card_last4, provider
  )
  ORDER BY merchant_name, txn_date, id;

  -- Eliminar duplicados
  DELETE FROM transactions
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM transactions
    GROUP BY txn_date, amount, merchant_name, card_last4, provider
  );

  -- Verificar resultado
  SELECT COUNT(*) AS remaining_transactions FROM transactions;

ROLLBACK; -- ← Cambiar a COMMIT cuando estés listo para aplicar


-- ============================================================
-- SECCIÓN 3: PREVENCIÓN — agregar constraint UNIQUE faltante
-- ============================================================
-- La causa raíz: el schema ideal (packages/sql/schema.sql) define
-- UNIQUE en idempotency_key, pero las migraciones reales nunca
-- lo agregaron a Supabase. Sin esa constraint, el código nunca
-- recibe el error 23505 que detiene la inserción duplicada.
--
-- IMPORTANTE: ejecutar DESPUÉS de la limpieza (sección 2),
-- o fallará si aún hay duplicados.

ALTER TABLE transactions
  ADD CONSTRAINT transactions_idempotency_key_unique
  UNIQUE (idempotency_key);

-- Verificar que quedó
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND indexname = 'transactions_idempotency_key_unique';
