ALTER TABLE user_habits
  ADD COLUMN IF NOT EXISTS target_completions_per_period INT NOT NULL DEFAULT 1;

ALTER TABLE user_habits
  DROP CONSTRAINT IF EXISTS user_habits_target_completions_per_period_check;

ALTER TABLE user_habits
  ADD CONSTRAINT user_habits_target_completions_per_period_check
  CHECK (target_completions_per_period >= 1);
