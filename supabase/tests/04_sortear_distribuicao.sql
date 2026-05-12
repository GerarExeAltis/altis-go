BEGIN;

SELECT plan(8);

-- Funcao existe
SELECT has_function('public', 'sortear_e_baixar_estoque', ARRAY['uuid'],
                    'sortear_e_baixar_estoque(UUID) existe');

-- ━━━━━━━━━━━━━━━━━━━━ Setup: usuario + evento + premios ━━━━━━━━━

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'test@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('11111111-1111-1111-1111-111111111111',
            'Evento Test', CURRENT_DATE, CURRENT_DATE+1, 'rascunho', v_user);
END $$;

INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial, estoque_atual,
                            ordem_roleta, e_premio_real, cor_hex)
  VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Vale R$10', 1, 100, 100, 1, true, '#4afad4'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'TV',       10, 1,   1,   2, true, '#009993'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Nao foi',  30, 0,   0,   3, false, '#555555');

-- ━━━━━━━━━━━━━━━━━━━━ Caso 1: sessao inexistente ━━━━━━━━━━━━━━━

SELECT throws_like(
  $$ SELECT public.sortear_e_baixar_estoque('99999999-9999-9999-9999-999999999999') $$,
  '%Sessao nao encontrada%',
  'lanca excecao se sessao_id nao existe'
);

-- ━━━━━━━━━━━━━━━━━━━━ Caso 2: status errado ━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
  v_sessao UUID := gen_random_uuid();
  v_user   UUID := (SELECT id FROM auth.users WHERE email='test@altis.local');
BEGIN
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por)
    VALUES (v_sessao, '11111111-1111-1111-1111-111111111111',
            'roleta', 'aguardando_celular', v_user);
  PERFORM set_config('test.sessao_aguardando_celular', v_sessao::text, true);
END $$;

SELECT throws_like(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('test.sessao_aguardando_celular')),
  '%Status invalido%',
  'lanca excecao se status nao e aguardando_dados'
);

-- ━━━━━━━━━━━━━━━━━━━━ Caso 3: sorteio bem-sucedido ━━━━━━━━━━━━━

DO $$
DECLARE
  v_sessao UUID := gen_random_uuid();
  v_user   UUID := (SELECT id FROM auth.users WHERE email='test@altis.local');
BEGIN
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                    jogador_nome, jogador_telefone, jogador_email)
    VALUES (v_sessao, '11111111-1111-1111-1111-111111111111',
            'roleta', 'aguardando_dados', v_user,
            'Maria Teste', '54988887777', 'maria@test.local');
  PERFORM set_config('test.sessao_pronta', v_sessao::text, true);
END $$;

SELECT lives_ok(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('test.sessao_pronta')),
  'sortear executa sem erro em sessao aguardando_dados'
);

-- Estoque total tem que ter caido exatamente 0 ou 1
SELECT ok(
  (SELECT SUM(estoque_inicial - estoque_atual)
     FROM public.premios
    WHERE evento_id='11111111-1111-1111-1111-111111111111') IN (0, 1),
  'estoque total reduzido em exatamente 0 ou 1 unidade'
);

-- Status atualizado
SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('test.sessao_pronta')::uuid),
  'pronta_para_girar',
  'sessao transicionou para pronta_para_girar'
);

-- Premio sorteado preenchido
SELECT isnt(
  (SELECT premio_sorteado_id FROM public.sessoes_jogo
    WHERE id=current_setting('test.sessao_pronta')::uuid),
  NULL,
  'premio_sorteado_id esta preenchido'
);

-- Ganhador inserido
SELECT is(
  (SELECT COUNT(*)::int FROM public.ganhadores
    WHERE sessao_id=current_setting('test.sessao_pronta')::uuid),
  1,
  'exatamente 1 linha em ganhadores'
);

SELECT * FROM finish();
ROLLBACK;
