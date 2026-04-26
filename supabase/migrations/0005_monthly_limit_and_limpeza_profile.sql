-- 1) Limite MENSAL no chat (substitui o diario)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS messages_month integer DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_message_month text; -- formato 'YYYY-MM'

-- 2) Profile da limpeza espiritual (coleta de dados antes da sessao)
CREATE TABLE IF NOT EXISTS limpeza_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  age integer,
  marital_status text,
  main_feeling text,
  situation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS limpeza_profile_user_idx ON limpeza_profile(user_id);

ALTER TABLE limpeza_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own limpeza profile"
  ON limpeza_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own limpeza profile"
  ON limpeza_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own limpeza profile"
  ON limpeza_profile FOR UPDATE
  USING (auth.uid() = user_id);
