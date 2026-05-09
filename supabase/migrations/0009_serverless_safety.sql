-- Substitui rate-limit em memoria (que nao funciona em serverless) e nonces
-- de webhook por estruturas persistidas no Postgres.
-- Tambem fecha race condition no oraculo diario via UNIQUE INDEX.

-- ============================================================
-- 1) Rate limiting persistido + RPC atomico
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_reset_idx ON rate_limit_buckets(reset_at);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role acessa.

-- RPC atomico: incrementa o bucket e devolve se a request foi permitida.
-- Usa INSERT...ON CONFLICT para garantir atomicidade entre leitura e escrita.
CREATE OR REPLACE FUNCTION check_rate_limit(p_key text, p_limit int, p_window_ms int)
RETURNS TABLE(allowed boolean, retry_after int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count int;
  v_reset timestamptz;
BEGIN
  INSERT INTO rate_limit_buckets AS b (key, count, reset_at)
  VALUES (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN b.reset_at < v_now THEN 1
      ELSE b.count + 1
    END,
    reset_at = CASE
      WHEN b.reset_at < v_now THEN v_now + (p_window_ms || ' milliseconds')::interval
      ELSE b.reset_at
    END
  RETURNING b.count, b.reset_at INTO v_count, v_reset;

  IF v_count > p_limit THEN
    RETURN QUERY SELECT false,
      GREATEST(1, EXTRACT(EPOCH FROM (v_reset - v_now))::int);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO service_role;

-- ============================================================
-- 2) Anti-replay para webhooks (Kiwify/Stripe)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_nonces (
  nonce text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_nonces_created_idx ON webhook_nonces(created_at);

ALTER TABLE webhook_nonces ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role escreve.

-- ============================================================
-- 3) Oracle: fecha race condition de leitura diaria duplicada
-- ============================================================
-- Dois requests paralelos do mesmo user em "today" passavam pelo SELECT...maybeSingle
-- com null e ambos inseriam — gerando duas readings para a mesma data.
CREATE UNIQUE INDEX IF NOT EXISTS oracle_readings_user_date_unique
  ON oracle_readings(user_id, date);
