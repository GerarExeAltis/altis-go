-- 20260512100001_senha_admin_helper.sql
-- Helper RPC para gravar/trocar a senha admin com bcrypt server-side.
-- Usa pgcrypto.crypt() e pgcrypto.gen_salt(). pgcrypto vive no schema
-- "extensions" no Supabase, por isso incluimos no search_path.
-- So executavel por service_role.

CREATE OR REPLACE FUNCTION private.definir_senha_admin(p_senha TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF length(p_senha) < 8 THEN
    RAISE EXCEPTION 'Senha admin precisa de ao menos 8 caracteres'
      USING ERRCODE = 'P0001';
  END IF;

  v_hash := extensions.crypt(p_senha, extensions.gen_salt('bf', 12));

  INSERT INTO public.admin_credenciais (id, senha_hash)
       VALUES (1, v_hash)
  ON CONFLICT (id) DO UPDATE
    SET senha_hash    = EXCLUDED.senha_hash,
        atualizada_em = NOW();
END $$;

REVOKE EXECUTE ON FUNCTION private.definir_senha_admin(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.definir_senha_admin(TEXT) TO service_role;

-- Helper para comparar senha em runtime (usado pela Edge Function validar-senha-admin).
CREATE OR REPLACE FUNCTION private.verificar_senha_admin(p_senha TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_credenciais
     WHERE id = 1
       AND senha_hash = extensions.crypt(p_senha, senha_hash)
  );
$$;

REVOKE EXECUTE ON FUNCTION private.verificar_senha_admin(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.verificar_senha_admin(TEXT) TO service_role;
