-- Example setup for budget alerts. Copy it locally, put your own values in the copy,
-- and run the copy in the Supabase SQL editor after 20261123000002_budgets.sql.
-- Never commit the filled-in copy: the repo is public.
--
-- The category names must match rows in public.categories.

INSERT INTO public.budgets (category_id, label, emoji, monthly_limit)
SELECT id, 'Comida fuera', '☕', 250
FROM public.categories WHERE name = 'Food & Dining'
ON CONFLICT (category_id) DO UPDATE
  SET label = EXCLUDED.label, emoji = EXCLUDED.emoji, monthly_limit = EXCLUDED.monthly_limit, is_active = true;

INSERT INTO public.budgets (category_id, label, emoji, monthly_limit)
SELECT id, 'Compras', '🛍️', 200
FROM public.categories WHERE name = 'Shopping'
ON CONFLICT (category_id) DO UPDATE
  SET label = EXCLUDED.label, emoji = EXCLUDED.emoji, monthly_limit = EXCLUDED.monthly_limit, is_active = true;

-- The migration already created the single settings row (id = 1).
-- frozen_cards holds the last 4 digits of cards that should not see new charges.
UPDATE public.alert_settings
SET big_purchase_threshold = 100,
    frozen_cards = '{0000,1111}',
    notify_every_purchase = true,
    alerts_enabled = true
WHERE id = 1;

-- Check what the alerts will see:
SELECT * FROM public.budget_status();
