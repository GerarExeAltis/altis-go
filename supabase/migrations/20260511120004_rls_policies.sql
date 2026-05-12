-- 20260511120004_rls_policies.sql
-- Habilita RLS e cria policies seguindo a Secao 5.3 do spec.
-- Depende de public.is_admin() (migration 20260511120003).

-- ━━━━━━━━━━━━━━━━━━━━━━ HABILITAR RLS ━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.perfis_operadores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credenciais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_jogo            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganhadores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprints_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria               ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━ perfis_operadores ━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_ve_proprio
  ON public.perfis_operadores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY admin_ve_todos_operadores
  ON public.perfis_operadores
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ admin_credenciais ━━━━━━━━━━━━━━━━━━━━━━

-- Sem policy SELECT — so Edge Functions com service_role leem.

CREATE POLICY admin_atualiza_senha
  ON public.admin_credenciais
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ lojas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_lojas
  ON public.lojas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_lojas
  ON public.lojas
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ eventos ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_eventos
  ON public.eventos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_eventos
  ON public.eventos
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ premios ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_premios
  ON public.premios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_premios
  ON public.premios
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ sessoes_jogo ━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Anon NAO tem policy — so Edge Functions com service_role acessam.

CREATE POLICY operador_le_sessoes
  ON public.sessoes_jogo
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY operador_atualiza_propria_sessao
  ON public.sessoes_jogo
  FOR UPDATE
  TO authenticated
  USING (liberada_por = auth.uid())
  WITH CHECK (liberada_por = auth.uid());

-- ━━━━━━━━━━━━━━━━━━━━━━ ganhadores ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_ganhadores
  ON public.ganhadores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY operador_marca_entrega
  ON public.ganhadores
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ━━━━━━━━━━━━━━━━━━━━━━ fingerprints_bloqueados ━━━━━━━━━━━━━━━━

CREATE POLICY admin_gerencia_fingerprints
  ON public.fingerprints_bloqueados
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ auditoria ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY admin_le_auditoria
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Inserts em auditoria sempre via service_role (Edge Functions).
