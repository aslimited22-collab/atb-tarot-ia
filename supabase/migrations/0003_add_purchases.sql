CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  kiwify_order_id text NOT NULL,
  plan text NOT NULL,
  event text NOT NULL,
  amount_cents integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_email_idx ON purchases(email);
CREATE INDEX IF NOT EXISTS purchases_order_idx ON purchases(kiwify_order_id);
CREATE INDEX IF NOT EXISTS purchases_created_idx ON purchases(created_at DESC);
