-- V2 Limpeza Espiritual em /limpeza (isolado das tabelas v1)
-- Estrutura: orders (pedido criado antes do checkout) + readings (preview e full)

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificacao do cliente (nao requer auth - publico)
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  birth_date date,
  sign text,
  locale text DEFAULT 'pt-BR',
  -- Conteudo da consulta
  theme text NOT NULL,
  question text NOT NULL,
  -- Comercial
  amount integer NOT NULL DEFAULT 97,           -- em reais (NAO em centavos)
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  product_type text NOT NULL DEFAULT 'limpeza_espiritual',
  payment_provider text DEFAULT 'kiwify',
  checkout_url text,
  payment_id text,
  -- Auditoria
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(email);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  preview_text text,
  full_text text,
  full_json jsonb,
  language text DEFAULT 'pt-BR',
  model_used text DEFAULT 'deepseek',
  generation_status text NOT NULL DEFAULT 'pending'
    CHECK (generation_status IN ('pending', 'preview_generated', 'completed', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS readings_order_idx ON readings(order_id);
CREATE INDEX IF NOT EXISTS readings_status_idx ON readings(generation_status);

-- RLS: bloqueia tudo para anon/authenticated. Apenas service_role escreve/le.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Sem policies = nada passa via anon/auth. Service role bypassa RLS por padrao.

-- Trigger updated_at
CREATE OR REPLACE FUNCTION limpeza_v2_touch_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_touch_updated ON orders;
CREATE TRIGGER orders_touch_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION limpeza_v2_touch_updated();

DROP TRIGGER IF EXISTS readings_touch_updated ON readings;
CREATE TRIGGER readings_touch_updated BEFORE UPDATE ON readings
  FOR EACH ROW EXECUTE FUNCTION limpeza_v2_touch_updated();
