-- Azton Module: Habits + Timeline + Mood + Gamification (single-user)

CREATE TABLE habit_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  default_duration_minutes INT NOT NULL DEFAULT 5,
  icon_identifier VARCHAR(50),
  color_hex VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_habits (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES habit_templates(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  icon_identifier VARCHAR(50),
  color_hex VARCHAR(7),
  day_block VARCHAR(20) NOT NULL,
  frequency_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
  custom_days_mask INT NOT NULL DEFAULT 127,
  target_duration_minutes INT NOT NULL DEFAULT 5,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_habit_id BIGINT NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  actual_duration_minutes INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_habit_day UNIQUE (user_habit_id, log_date)
);

CREATE TABLE mood_logs (
  id BIGSERIAL PRIMARY KEY,
  log_date DATE NOT NULL,
  mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  journal_text VARCHAR(280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_mood_day UNIQUE (log_date)
);

CREATE TABLE mood_tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mood_log_tags (
  mood_log_id BIGINT NOT NULL REFERENCES mood_logs(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES mood_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (mood_log_id, tag_id)
);

CREATE INDEX idx_user_habits_active ON user_habits(is_active, day_block, sort_order);
CREATE INDEX idx_habit_logs_date ON habit_logs(log_date DESC);
CREATE INDEX idx_habit_logs_habit ON habit_logs(user_habit_id, log_date DESC);
CREATE INDEX idx_mood_logs_date ON mood_logs(log_date DESC);

CREATE TRIGGER update_habit_templates_updated_at BEFORE UPDATE ON habit_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_habits_updated_at BEFORE UPDATE ON user_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mood_logs_updated_at BEFORE UPDATE ON mood_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mood_tags_updated_at BEFORE UPDATE ON mood_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_log_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON habit_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON user_habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON habit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_log_tags FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW v_habit_daily_completion
WITH (security_invoker = on) AS
SELECT
  log_date,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
  COUNT(*) AS logged_count
FROM habit_logs
GROUP BY log_date;

INSERT INTO habit_templates (name, category, default_duration_minutes, icon_identifier, color_hex) VALUES
  ('Beber agua', 'Salud', 5, 'water', '#3BA7FF'),
  ('Caminar', 'Salud', 20, 'walk', '#34D399'),
  ('Estirar', 'Salud', 10, 'stretch', '#22D3EE'),
  ('Meditar', 'Mente', 10, 'meditate', '#A78BFA'),
  ('Journaling', 'Mente', 10, 'journal', '#F472B6'),
  ('Lectura', 'Mente', 20, 'book', '#FBBF24'),
  ('Deep work', 'Productividad', 50, 'focus', '#F59E0B'),
  ('Planificar el día', 'Productividad', 10, 'plan', '#60A5FA');

INSERT INTO mood_tags (name, category) VALUES
  ('Insomnio', 'PHYSICAL_SYMPTOM'),
  ('Dolor de cabeza', 'PHYSICAL_SYMPTOM'),
  ('Fatiga', 'PHYSICAL_SYMPTOM'),
  ('Ansiedad', 'PHYSICAL_SYMPTOM'),
  ('Estrés laboral', 'EXTERNAL_TRIGGER'),
  ('Cafeína', 'EXTERNAL_TRIGGER'),
  ('Mala alimentación', 'EXTERNAL_TRIGGER'),
  ('Discusión', 'EXTERNAL_TRIGGER');

INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'MORNING', 'DAILY', default_duration_minutes, 0
FROM habit_templates
WHERE name = 'Beber agua';

INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'MORNING', 'DAILY', default_duration_minutes, 1
FROM habit_templates
WHERE name = 'Meditar';

INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'AFTERNOON', 'WEEKDAYS', default_duration_minutes, 0
FROM habit_templates
WHERE name = 'Deep work';
