-- Registros de mood en cualquier momento del día (varios por día).
-- mood_logs sigue siendo el resumen diario con journal y tags.

CREATE TABLE IF NOT EXISTS mood_checkins (
  id BIGSERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  note VARCHAR(140),
  source VARCHAR(16) NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'widget')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_checkins_checked_at ON mood_checkins(checked_at DESC);

ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON mood_checkins FOR ALL USING (true) WITH CHECK (true);
