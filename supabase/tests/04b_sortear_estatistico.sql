BEGIN;

SELECT plan(3);

-- Setup: evento com 3 slots "Nao foi" (peso 60, 30, 10) para distribuicao
-- estatistica sem complicacao de baixa de estoque.

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'stat@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Evento Stat', CURRENT_DATE, CURRENT_DATE+1, 'rascunho', v_user);

  INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial,
                              estoque_atual, ordem_roleta, e_premio_real)
    VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 60, 0, 0, 1, false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'B', 30, 0, 0, 2, false),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C', 10, 0, 0, 3, false);
END $$;

-- Roda 1000 sorteios
DO $$
DECLARE
  v_user UUID := (SELECT id FROM auth.users WHERE email='stat@altis.local');
  v_sessao UUID;
  i INT;
BEGIN
  FOR i IN 1..1000 LOOP
    v_sessao := gen_random_uuid();
    INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                      jogador_nome, jogador_telefone, jogador_email)
      VALUES (v_sessao, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              'roleta', 'aguardando_dados', v_user,
              'Tester ' || i, '5499' || lpad(i::text, 7, '0'),
              'tester' || i || '@local');
    PERFORM public.sortear_e_baixar_estoque(v_sessao);
  END LOOP;
END $$;

-- A deve sair ~600 vezes (60%) — IC 99% = 540-660
SELECT ok(
  (SELECT COUNT(*) FROM public.ganhadores
    WHERE premio_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') BETWEEN 540 AND 660,
  'slot A (peso 60) sai entre 540 e 660 vezes (esperado ~600)'
);

-- B ~300 ± 50
SELECT ok(
  (SELECT COUNT(*) FROM public.ganhadores
    WHERE premio_id='cccccccc-cccc-cccc-cccc-cccccccccccc') BETWEEN 250 AND 350,
  'slot B (peso 30) sai entre 250 e 350 vezes (esperado ~300)'
);

-- C ~100 ± 30
SELECT ok(
  (SELECT COUNT(*) FROM public.ganhadores
    WHERE premio_id='dddddddd-dddd-dddd-dddd-dddddddddddd') BETWEEN 70 AND 130,
  'slot C (peso 10) sai entre 70 e 130 vezes (esperado ~100)'
);

SELECT * FROM finish();
ROLLBACK;
