-- 20260512000001_security_perf_cleanup.sql
-- Endereca lints de seguranca e performance reportados pelo linter do Supabase:
--   [SEC] sortear_e_baixar_estoque exposto via REST RPC para anon/authenticated
--   [SEC] is_admin() exposto via REST RPC (move para schema private)
--   [SEC] bucket publico fotos_premios permitia listar (drop SELECT policy)
--   [SEC] admin_credenciais visivel para anon (revoga SELECT)
--   [PERF] auth.uid() re-avaliado por linha em 2 policies (envolve em SELECT)
--   [PERF] multiple permissive SELECT policies (separa admin FOR ALL em
--          INSERT/UPDATE/DELETE distintos, sem afetar SELECT do operador)
--   [SEC/cosmetico] operador_marca_entrega com USING (true) -> usa auth.uid() IS NOT NULL

-- ━━━━━━━━━━━━━━━━━━━━━━━━ 1. EXECUTE PERMISSIONS ━━━━━━━━━━━━━━━━━

-- sortear: REVOKE FROM PUBLIC nao cobre roles diretamente; explicito.
REVOKE EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID)
       FROM anon, authenticated, PUBLIC;
-- service_role mantem (foi granted na migration 20260511120005)

-- ━━━━━━━━━━━━━━━━━━━━━━━━ 2. MOVER is_admin PARA private ━━━━━━━━

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO postgres, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'admin_elevado')::boolean,
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated, service_role;

-- ━━━━━━━━━━━━━━━━━━━━━━━━ 3. DROP POLICIES ANTIGAS ━━━━━━━━━━━━━━

DROP POLICY IF EXISTS operador_ve_proprio              ON public.perfis_operadores;
DROP POLICY IF EXISTS admin_ve_todos_operadores        ON public.perfis_operadores;
DROP POLICY IF EXISTS admin_atualiza_senha             ON public.admin_credenciais;
DROP POLICY IF EXISTS operador_le_lojas                ON public.lojas;
DROP POLICY IF EXISTS admin_cud_lojas                  ON public.lojas;
DROP POLICY IF EXISTS operador_le_eventos              ON public.eventos;
DROP POLICY IF EXISTS admin_cud_eventos                ON public.eventos;
DROP POLICY IF EXISTS operador_le_premios              ON public.premios;
DROP POLICY IF EXISTS admin_cud_premios                ON public.premios;
DROP POLICY IF EXISTS operador_le_sessoes              ON public.sessoes_jogo;
DROP POLICY IF EXISTS operador_atualiza_propria_sessao ON public.sessoes_jogo;
DROP POLICY IF EXISTS operador_le_ganhadores           ON public.ganhadores;
DROP POLICY IF EXISTS operador_marca_entrega           ON public.ganhadores;
DROP POLICY IF EXISTS admin_gerencia_fingerprints      ON public.fingerprints_bloqueados;
DROP POLICY IF EXISTS admin_le_auditoria               ON public.auditoria;

-- Storage policy tambem referencia public.is_admin()
DROP POLICY IF EXISTS "admin_gerencia_fotos" ON storage.objects;
DROP POLICY IF EXISTS "ler_fotos_premios"    ON storage.objects;

-- Agora pode dropar a funcao public.is_admin (sem referencias)
DROP FUNCTION IF EXISTS public.is_admin();

-- ━━━━━━━━━━━━━━━━━━━━━━━━ 4. POLICIES NOVAS ━━━━━━━━━━━━━━━━━━━━━━
-- Padrao geral:
--   - 1 policy SELECT (cobrir todos os casos numa policy permissiva)
--   - 3 policies admin separadas: INSERT, UPDATE, DELETE
--   - auth.uid() envelopada em (SELECT ...) para evitar re-eval per row

-- ━━━━ perfis_operadores ━━━━
CREATE POLICY le_operadores
  ON public.perfis_operadores FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR private.is_admin());

CREATE POLICY admin_insert_operadores
  ON public.perfis_operadores FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY admin_update_operadores
  ON public.perfis_operadores FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_operadores
  ON public.perfis_operadores FOR DELETE TO authenticated
  USING (private.is_admin());

-- ━━━━ admin_credenciais (no SELECT policy) ━━━━
-- Revoga SELECT de anon (mitiga pg_graphql exposure parcial)
REVOKE SELECT ON public.admin_credenciais FROM anon;

CREATE POLICY admin_atualiza_senha
  ON public.admin_credenciais FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- ━━━━ lojas ━━━━
CREATE POLICY le_lojas
  ON public.lojas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_insert_lojas
  ON public.lojas FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY admin_update_lojas
  ON public.lojas FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_lojas
  ON public.lojas FOR DELETE TO authenticated
  USING (private.is_admin());

-- ━━━━ eventos ━━━━
CREATE POLICY le_eventos
  ON public.eventos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_insert_eventos
  ON public.eventos FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY admin_update_eventos
  ON public.eventos FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_eventos
  ON public.eventos FOR DELETE TO authenticated
  USING (private.is_admin());

-- ━━━━ premios ━━━━
CREATE POLICY le_premios
  ON public.premios FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_insert_premios
  ON public.premios FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY admin_update_premios
  ON public.premios FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_premios
  ON public.premios FOR DELETE TO authenticated
  USING (private.is_admin());

-- ━━━━ sessoes_jogo ━━━━
CREATE POLICY operador_le_sessoes
  ON public.sessoes_jogo FOR SELECT TO authenticated
  USING (true);

CREATE POLICY operador_atualiza_propria_sessao
  ON public.sessoes_jogo FOR UPDATE TO authenticated
  USING (liberada_por = (SELECT auth.uid()))
  WITH CHECK (liberada_por = (SELECT auth.uid()));

-- ━━━━ ganhadores ━━━━
CREATE POLICY operador_le_ganhadores
  ON public.ganhadores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY operador_marca_entrega
  ON public.ganhadores FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ━━━━ fingerprints_bloqueados ━━━━ (4 policies separadas, admin only)
CREATE POLICY admin_le_fingerprints
  ON public.fingerprints_bloqueados FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY admin_insert_fingerprints
  ON public.fingerprints_bloqueados FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY admin_update_fingerprints
  ON public.fingerprints_bloqueados FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY admin_delete_fingerprints
  ON public.fingerprints_bloqueados FOR DELETE TO authenticated
  USING (private.is_admin());

-- ━━━━ auditoria ━━━━
CREATE POLICY admin_le_auditoria
  ON public.auditoria FOR SELECT TO authenticated
  USING (private.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━ 5. STORAGE BUCKET ━━━━━━━━━━━━━━━━━━━━━━
-- Bucket continua publico (acesso via URL direta funciona).
-- Removida policy SELECT broad que permitia listagem.
-- Mantida policy admin para upload/edit/delete.

CREATE POLICY "admin_gerencia_fotos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'fotos_premios' AND private.is_admin())
  WITH CHECK (bucket_id = 'fotos_premios' AND private.is_admin());
