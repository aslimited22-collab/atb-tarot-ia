-- Garante que se um usuário for deletado em auth.users (LGPD/GDPR right-to-erase),
-- a row correspondente em public.users também desaparece — em vez de ficar órfã.
-- Idempotente: tenta criar a constraint nova só se a antiga existir sem CASCADE.

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Localiza a FK existente users.id -> auth.users(id)
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF v_constraint_name IS NOT NULL THEN
    -- Drop e recria com ON DELETE CASCADE (idempotência: se já tem cascade,
    -- a recriação ainda é segura)
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', v_constraint_name);
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;
