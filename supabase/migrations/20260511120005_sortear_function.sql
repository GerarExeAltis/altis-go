-- 20260511120005_sortear_function.sql
-- Funcao atomica: lock pessimista da sessao, calcula pesos efetivos
-- (peso_base x estoque_atual para premios reais; peso_base puro para "Nao foi"),
-- sorteia ponderado, baixa estoque, atualiza sessao, insere ganhador,
-- grava auditoria. Tudo numa unica transacao.

CREATE OR REPLACE FUNCTION public.sortear_e_baixar_estoque(p_sessao_id UUID)
RETURNS TABLE (
  premio_id      UUID,
  nome           TEXT,
  cor_hex        TEXT,
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
  -- 1) Lock pessimista da sessao
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

  -- 2) Lock dos premios + calculo de peso efetivo
  -- ON COMMIT DROP nao basta em testes que chamam sortear() multiplas vezes
  -- dentro da mesma transacao; drop manual ao inicio.
  DROP TABLE IF EXISTS _sorteio_pool;
  CREATE TEMP TABLE _sorteio_pool ON COMMIT DROP AS
    SELECT p.id, p.peso_base, p.estoque_atual, p.e_premio_real,
           p.ordem_roleta, p.nome, p.cor_hex, p.foto_path,
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

  -- 3) Sorteio uniforme em [0, v_total)
  v_sorteio := random() * v_total;

  -- 4) Itera em ordem deterministica
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

  -- 5) Baixa estoque so se premio real
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

  -- 6) Atualiza sessao
  UPDATE public.sessoes_jogo
     SET premio_sorteado_id = v_escolhido_id,
         status             = 'pronta_para_girar',
         girada_em          = NOW()
   WHERE id = p_sessao_id;

  -- 7) Insere ganhador
  INSERT INTO public.ganhadores (sessao_id, evento_id, premio_id,
                                  jogador_nome, jogador_telefone,
                                  jogador_email, jogador_loja_id)
    SELECT s.id, s.evento_id, v_escolhido_id,
           s.jogador_nome, s.jogador_telefone,
           s.jogador_email, s.jogador_loja_id
      FROM public.sessoes_jogo s
     WHERE s.id = p_sessao_id;

  -- 8) Auditoria
  INSERT INTO public.auditoria (evento_id, acao, recurso_tipo, recurso_id, detalhes)
    VALUES (v_evento_id, 'sortear', 'sessoes_jogo', p_sessao_id,
            jsonb_build_object(
              'premio_id',       v_escolhido_id,
              'total_peso',      v_total,
              'sorteio',         v_sorteio,
              'acumulado_final', v_acumulado,
              'e_premio_real',   v_escolhido_real
            ));

  -- 9) Retorna detalhes para a Edge Function repassar via Realtime
  RETURN QUERY
    SELECT p.id, p.nome, p.cor_hex, p.foto_path, p.ordem_roleta, p.e_premio_real
      FROM public.premios p
     WHERE p.id = v_escolhido_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) TO service_role;
