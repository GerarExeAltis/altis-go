BEGIN;

SELECT plan(2);

-- Setup: evento com 1 premio de estoque 10 + slot "Nao foi" com peso baixissimo
DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'conc@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            'Evento Conc', CURRENT_DATE, CURRENT_DATE+1, 'ativo', v_user);

  INSERT INTO public.premios (evento_id, nome, peso_base, estoque_inicial,
                              estoque_atual, ordem_roleta, e_premio_real)
    VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vale',    100, 10, 10, 1, true),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nao foi', 1,   0,  0,  2, false);
END $$;

-- Cria 50 sessoes prontas e sorteia todas em sequencia
DO $$
DECLARE
  v_user UUID := (SELECT id FROM auth.users WHERE email='conc@altis.local');
  v_sessao UUID;
  i INT;
BEGIN
  FOR i IN 1..50 LOOP
    v_sessao := gen_random_uuid();
    INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                      jogador_nome, jogador_telefone, jogador_email)
      VALUES (v_sessao, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              'roleta', 'aguardando_dados', v_user,
              'Tester ' || i, '5499' || lpad(i::text, 7, '0'),
              'c' || i || '@local');
    PERFORM public.sortear_e_baixar_estoque(v_sessao);
  END LOOP;
END $$;

-- Estoque do Vale: peso 100x10=1000 vs Nao foi 1; quase certamente esgota
SELECT is(
  (SELECT estoque_atual FROM public.premios
    WHERE evento_id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND nome='Vale'),
  0,
  'estoque Vale e exatamente 0 apos 50 sorteios'
);

-- Exatamente 10 ganhadores com Vale (sem dupla baixa)
SELECT is(
  (SELECT COUNT(*)::int FROM public.ganhadores g
     JOIN public.premios p ON p.id = g.premio_id
    WHERE g.evento_id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      AND p.nome = 'Vale'),
  10,
  'exatamente 10 ganhadores receberam Vale (sem dupla baixa)'
);

SELECT * FROM finish();
ROLLBACK;
