CREATE TABLE IF NOT EXISTS limpeza_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS limpeza_messages_user_idx ON limpeza_messages(user_id);
CREATE INDEX IF NOT EXISTS limpeza_messages_user_created_idx ON limpeza_messages(user_id, created_at);

ALTER TABLE limpeza_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own limpeza messages"
  ON limpeza_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own limpeza messages"
  ON limpeza_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
