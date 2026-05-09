-- Adiciona rastreamento de entrega (email/whatsapp) na orders V2.
-- Idempotente: usa IF NOT EXISTS / DO blocks para nao quebrar se ja aplicada.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_last_error text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_last_attempt_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_email_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_whatsapp_sent_at timestamptz;

-- Indice para busca de pedidos pendentes de entrega (cron/script)
CREATE INDEX IF NOT EXISTS orders_delivery_status_idx
  ON orders(delivery_status, status);

-- CHECK constraint flexivel via DO block (PostgreSQL nao suporta IF NOT EXISTS em CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_status_check
      CHECK (delivery_status IN (
        'pending',
        'email_sent',
        'whatsapp_sent',
        'both_sent',
        'failed',
        'manual_review'
      ));
  END IF;
END$$;
