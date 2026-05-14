-- 20260513120001_remover_lojas_add_empresa.sql
--
-- Remove a entidade "lojas" do projeto. No formulario do jogador (celular)
-- o campo "loja_id" (FK para tabela lojas com select pre-cadastrado) e
-- substituido por "empresa" — texto livre opcional onde o jogador digita
-- o nome da empresa onde trabalha. Mais simples para o cliente, sem
-- carga administrativa de manter o cadastro de lojas.
--
-- Passos:
--   1) sessoes_jogo: adiciona jogador_empresa TEXT, dropa FK + coluna jogador_loja_id
--   2) ganhadores:   adiciona jogador_empresa TEXT, dropa FK + coluna jogador_loja_id
--   3) Recria sortear_e_baixar_estoque para fazer INSERT em ganhadores
--      sem a coluna removida e com jogador_empresa
--   4) Dropa policies + tabela lojas

-- 1) sessoes_jogo
ALTER TABLE public.sessoes_jogo
  ADD COLUMN jogador_empresa TEXT;
ALTER TABLE public.sessoes_jogo
  DROP COLUMN jogador_loja_id;

-- 2) ganhadores
ALTER TABLE public.ganhadores
  ADD COLUMN jogador_empresa TEXT;
ALTER TABLE public.ganhadores
  DROP COLUMN jogador_loja_id;

-- 3) Recria a funcao de sorteio com a nova coluna jogador_empresa
CREATE OR REPLACE FUNCTION public.sortear_e_baixar_estoque(p_sessao_id UUID)
RETURNS TABLE (
  premio_id      UUID,
  nome           TEXT,
  foto_path      TEXT,
  ordem_roleta   INT,
  e_premio_real  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
#variable_conflict use_column
DECLARE
  v_evento_id      UUID;
  v_status         public.sessao_status;
  v_total          NUMERIC;
  v_sorteio        NUMERIC;
  v_acumulado      NUMERIC := 0;
  v_escolhido_id   UUID;
  v_escolhido_real BOOLEAN;
  v_premio         RECORD;
BEGIN
  SELECT s.evento_id, s.status
    INTO v_evento_id, v_status
    FROM public.sessoes_jogo s
   WHERE s.id = p_sessao_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessao nao encontrada: %', p_sessao_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'aguardando_dados' THEN
    RAISE EXCEPTION 'Status invalido para sorteio: % (esperado: aguardando_dados)',
                    v_status USING ERRCODE = 'P0001';
  END IF;

  DROP TABLE IF EXISTS _sorteio_pool;
  CREATE TEMP TABLE _sorteio_pool ON COMMIT DROP AS
    SELECT p.id, p.peso_base, p.estoque_atual, p.e_premio_real,
           p.ordem_roleta, p.nome, p.foto_path,
           CASE
             WHEN p.e_premio_real = false THEN p.peso_base::NUMERIC
             ELSE (p.peso_base * p.estoque_atual)::NUMERIC
           END AS peso_efetivo
      FROM public.premios p
     WHERE p.evento_id = v_evento_id
       AND (p.estoque_atual > 0 OR p.e_premio_real = false)
       AND p.peso_base > 0
     FOR UPDATE;

  SELECT COALESCE(SUM(peso_efetivo), 0) INTO v_total FROM _sorteio_pool;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Sem premios disponiveis para sorteio (evento %)',
                    v_evento_id USING ERRCODE = 'P0001';
  END IF;

  v_sorteio := random() * v_total;

  FOR v_premio IN
    SELECT id, peso_efetivo, e_premio_real
      FROM _sorteio_pool
     ORDER BY ordem_roleta, id
  LOOP
    v_acumulado := v_acumulado + v_premio.peso_efetivo;
    IF v_sorteio < v_acumulado THEN
      v_escolhido_id   := v_premio.id;
      v_escolhido_real := v_premio.e_premio_real;
      EXIT;
    END IF;
  END LOOP;

  IF v_escolhido_id IS NULL THEN
    RAISE EXCEPTION 'Falha interna no sorteio (sem escolhido); total=% sorteio=%',
                    v_total, v_sorteio USING ERRCODE = 'P0001';
  END IF;

  IF v_escolhido_real THEN
    UPDATE public.premios
       SET estoque_atual = estoque_atual - 1
     WHERE id = v_escolhido_id
       AND estoque_atual > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Concorrencia: estoque zerou entre lock e UPDATE'
                      USING ERRCODE = '40001';
    END IF;
  END IF;

  UPDATE public.sessoes_jogo
     SET premio_sorteado_id = v_escolhido_id,
         status             = 'pronta_para_girar',
         girada_em          = NOW()
   WHERE id = p_sessao_id;

  INSERT INTO public.ganhadores (sessao_id, evento_id, premio_id,
                                  jogador_nome, jogador_telefone,
                                  jogador_email, jogador_empresa)
    SELECT s.id, s.evento_id, v_escolhido_id,
           s.jogador_nome, s.jogador_telefone,
           s.jogador_email, s.jogador_empresa
      FROM public.sessoes_jogo s
     WHERE s.id = p_sessao_id;

  INSERT INTO public.auditoria (evento_id, acao, recurso_tipo, recurso_id, detalhes)
    VALUES (v_evento_id, 'sortear', 'sessoes_jogo', p_sessao_id,
            jsonb_build_object(
              'premio_id',       v_escolhido_id,
              'total_peso',      v_total,
              'sorteio',         v_sorteio,
              'acumulado_final', v_acumulado,
              'e_premio_real',   v_escolhido_real
            ));

  RETURN QUERY
    SELECT p.id, p.nome, p.foto_path, p.ordem_roleta, p.e_premio_real
      FROM public.premios p
     WHERE p.id = v_escolhido_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) TO service_role;

-- 4) Remove policies e dropa a tabela lojas
DROP POLICY IF EXISTS le_lojas_authenticated    ON public.lojas;
DROP POLICY IF EXISTS admin_insert_lojas        ON public.lojas;
DROP POLICY IF EXISTS admin_update_lojas        ON public.lojas;
DROP POLICY IF EXISTS admin_delete_lojas        ON public.lojas;
DROP POLICY IF EXISTS operador_le_lojas         ON public.lojas;
DROP POLICY IF EXISTS admin_cud_lojas           ON public.lojas;

DROP TABLE public.lojas;
