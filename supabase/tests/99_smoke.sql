-- supabase/tests/99_smoke.sql
-- Cenario ponta-a-ponta: liberar jogada (manual) -> submeter dados -> sortear -> finalizar.
-- Usa o evento/operador do seed.sql.

BEGIN;

SELECT plan(6);

-- Pega o operador dev e o evento demo do seed
DO $$
DECLARE
  v_user UUID := '00000000-0000-0000-0000-000000000001';
  v_evento UUID := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_sessao UUID := gen_random_uuid();
BEGIN
  -- Simula liberar-jogada
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por)
    VALUES (v_sessao, v_evento, 'roleta', 'aguardando_celular', v_user);

  PERFORM set_config('smoke.sessao', v_sessao::text, true);
END $$;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'aguardando_celular',
  'sessao criada em aguardando_celular'
);

-- Simula scan do QR
UPDATE public.sessoes_jogo
   SET status = 'aguardando_dados'
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'aguardando_dados',
  'transicao para aguardando_dados OK'
);

-- Simula submeter-dados (preenche jogador + chama sortear)
UPDATE public.sessoes_jogo
   SET jogador_nome     = 'Joao Smoke',
       jogador_telefone = '54988880001',
       jogador_email    = 'joao@smoke.local'
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT lives_ok(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('smoke.sessao')),
  'sortear executou sem erro'
);

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'pronta_para_girar',
  'status virou pronta_para_girar'
);

-- Simula concluir-animacao
UPDATE public.sessoes_jogo
   SET status = 'finalizada',
       finalizada_em = NOW()
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'finalizada',
  'status virou finalizada'
);

-- Verifica auditoria registrou sortear
SELECT ok(
  (SELECT COUNT(*) FROM public.auditoria
    WHERE recurso_id = current_setting('smoke.sessao')::uuid
      AND acao = 'sortear') >= 1,
  'auditoria registra o sortear'
);

SELECT * FROM finish();
ROLLBACK;
