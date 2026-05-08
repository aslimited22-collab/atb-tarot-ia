-- Sessao Espirita com Espirito Mentor (R$ 437)
-- Tabelas: espirito_messages (chat 3 msgs) + espirito_profile (coleta)

CREATE TABLE IF NOT EXISTS espirito_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS espirito_messages_user_idx ON espirito_messages(user_id);
CREATE INDEX IF NOT EXISTS espirito_messages_user_created_idx ON espirito_messages(user_id, created_at);

ALTER TABLE espirito_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own espirito messages" ON espirito_messages;
CREATE POLICY "Users read own espirito messages" ON espirito_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own espirito messages" ON espirito_messages;
CREATE POLICY "Users insert own espirito messages" ON espirito_messages FOR INSERT WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS espirito_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  age integer,
  lost_loved_one text,        -- enum: mae, pai, marido_esposa, filho, irmao, avo, amigo, outro, ninguem
  who_to_talk text,           -- nome de quem quer falar (texto livre)
  main_question text,         -- pergunta principal (texto livre)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS espirito_profile_user_idx ON espirito_profile(user_id);

ALTER TABLE espirito_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own espirito profile" ON espirito_profile;
CREATE POLICY "Users read own espirito profile" ON espirito_profile FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own espirito profile" ON espirito_profile;
CREATE POLICY "Users insert own espirito profile" ON espirito_profile FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own espirito profile" ON espirito_profile;
CREATE POLICY "Users update own espirito profile" ON espirito_profile FOR UPDATE USING (auth.uid() = user_id);
