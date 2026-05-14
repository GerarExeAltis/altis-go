-- 20260514120001_perfil_operador_auto.sql
--
-- Cria automaticamente uma linha em public.perfis_operadores quando
-- um novo usuario eh registrado em auth.users (via signup OU via
-- "Add user" no dashboard do Supabase).
--
-- Por padrao, o novo perfil entra com `ativo = false`. O AuthGuard
-- no front rejeita o login enquanto o flag for false — um admin precisa
-- promover o operador no painel /admin/operadores. Isso evita que
-- contas criadas no auth.users sem passar pelo fluxo administrativo
-- ganhem acesso ao sistema automaticamente.
--
-- Para o operador "raiz" que cria o sistema:
--   UPDATE public.perfis_operadores SET ativo = true WHERE id = '<uuid>';

CREATE OR REPLACE FUNCTION public.tg_criar_perfil_operador()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.perfis_operadores (id, nome_completo, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email, 'sem nome'),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_criar_perfil_operador_apos_signup ON auth.users;
CREATE TRIGGER tg_criar_perfil_operador_apos_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_criar_perfil_operador();

-- Backfill: para qualquer user em auth.users que ainda nao tenha perfil
-- (criado antes deste trigger existir), cria com ativo=false. O admin
-- precisa ativar manualmente.
INSERT INTO public.perfis_operadores (id, nome_completo, ativo)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome_completo', u.email, 'sem nome'),
       false
  FROM auth.users u
 WHERE NOT EXISTS (
   SELECT 1 FROM public.perfis_operadores p WHERE p.id = u.id
 );
