-- RLS diagnostic. NOT a migration: read only, run by hand in the Supabase SQL editor.
-- Returns object names and counts only (no emails, endpoints, tokens or amounts).
-- Healthy result after 20261102000002_multi_user_rls.sql and 20261123000001_revoke_anon_privileges.sql:
--   no 2_table_without_rls rows, no 3_anon_exposed_table rows, no policy with roles=public or anon,
--   no 4_view_without_security_invoker rows, every finance table with an "Owner only" policy,
--   5_security_definer_fn callable by clients only for is_owner(), and 6_owner_setup saying "existe" twice.

WITH
policies AS (
  SELECT '1_policy' AS check_type,
         tablename || '.' || policyname AS item,
         'roles=' || array_to_string(roles, ',') || ' cmd=' || cmd
           || ' using=' || coalesce(qual, '-')
           || ' check=' || coalesce(with_check, '-') AS detail
  FROM pg_policies
  WHERE schemaname = 'public'
),
no_rls AS (
  SELECT '2_table_without_rls', c.relname::text, 'RLS desactivado'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
),
anon_exposed AS (
  -- Tablas que anon puede tocar: tiene privilegio Y (sin RLS o con politica que aplica a anon/public).
  SELECT '3_anon_exposed_table', c.relname::text,
         'select=' || has_table_privilege('anon', c.oid, 'SELECT')
           || ' insert=' || has_table_privilege('anon', c.oid, 'INSERT')
           || ' update=' || has_table_privilege('anon', c.oid, 'UPDATE')
           || ' delete=' || has_table_privilege('anon', c.oid, 'DELETE')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
    AND (
      NOT c.relrowsecurity
      OR EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
          AND p.roles && ARRAY['public', 'anon']::name[]
      )
    )
),
views AS (
  SELECT '4_view_without_security_invoker', c.relname::text,
         'anon_select=' || has_table_privilege('anon', c.oid, 'SELECT')
           || ' authenticated_select=' || has_table_privilege('authenticated', c.oid, 'SELECT')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    AND NOT coalesce(c.reloptions && ARRAY['security_invoker=on', 'security_invoker=true'], false)
),
secdef AS (
  SELECT '5_security_definer_fn', p.oid::regprocedure::text,
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')
           || ' authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
           || ' returns=' || format_type(p.prorettype, NULL)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
),
owner_objects AS (
  SELECT '6_owner_setup', 'public.app_owner',
         CASE WHEN to_regclass('public.app_owner') IS NULL THEN 'no existe' ELSE 'existe' END
  UNION ALL
  SELECT '6_owner_setup', 'public.is_owner()',
         CASE WHEN to_regprocedure('public.is_owner()') IS NULL THEN 'no existe' ELSE 'existe' END
),
counts AS (
  SELECT '7_count', 'auth.users total / con login en 30 dias',
         (SELECT count(*) || ' / ' || count(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days')
          FROM auth.users)
  UNION ALL
  SELECT '7_count', 'auth.identities por provider',
         (SELECT coalesce(string_agg(provider || '=' || n, ', '), '-')
          FROM (SELECT provider, count(*) AS n FROM auth.identities GROUP BY provider) x)
  UNION ALL
  SELECT '7_count', 'push_subscriptions activas / total / user_email distintos',
         (SELECT count(*) FILTER (WHERE is_active) || ' / ' || count(*) || ' / ' || count(DISTINCT user_email)
          FROM public.push_subscriptions)
  UNION ALL
  SELECT '7_count', 'push_subscriptions creadas en 90 dias',
         (SELECT count(*)::text FROM public.push_subscriptions WHERE created_at > now() - interval '90 days')
)
SELECT * FROM policies
UNION ALL SELECT * FROM no_rls
UNION ALL SELECT * FROM anon_exposed
UNION ALL SELECT * FROM views
UNION ALL SELECT * FROM secdef
UNION ALL SELECT * FROM owner_objects
UNION ALL SELECT * FROM counts
ORDER BY 1, 2;
