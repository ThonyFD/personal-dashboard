-- Ensure Android/web habit editors can persist weekly and monthly targets.
-- This is intentionally idempotent because an earlier migration may already
-- exist in migration history while the remote schema is missing the column.
ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS target_completions_per_period INT NOT NULL DEFAULT 1;

ALTER TABLE public.user_habits
  DROP CONSTRAINT IF EXISTS user_habits_target_completions_per_period_check;

ALTER TABLE public.user_habits
  ADD CONSTRAINT user_habits_target_completions_per_period_check
  CHECK (target_completions_per_period >= 1);

COMMENT ON COLUMN public.user_habits.target_completions_per_period IS
  'Number of completions required inside the current weekly or monthly window.';

-- Force PostgREST to refresh immediately so writes do not fail with PGRST204.
NOTIFY pgrst, 'reload schema';
