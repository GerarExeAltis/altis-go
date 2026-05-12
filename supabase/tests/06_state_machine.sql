BEGIN;

SELECT plan(5);

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'sm@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff',
            'Evento SM', CURRENT_DATE, CURRENT_DATE+1, 'rascunho', v_user);
END $$;

-- Caso 1: CHECK dados_quando_pronta bloqueia
SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'pronta_para_girar',
        (SELECT id FROM auth.users WHERE email='sm@altis.local')) $$,
  '%dados_quando_pronta%',
  'CHECK dados_quando_pronta bloqueia transicao pra pronta sem dados'
);

-- Caso 2: CHECK premio_quando_finalizada bloqueia
SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'X', '54988887777', 'x@x') $$,
  '%premio_quando_finalizada%',
  'CHECK premio_quando_finalizada bloqueia finalizada sem premio'
);

-- Caso 3: UNIQUE jogada_tel_evento_jogo bloqueia
INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial,
                            estoque_atual, ordem_roleta, e_premio_real)
  VALUES ('aabbccdd-aabb-ccdd-eeff-001122334455',
          'ffffffff-ffff-ffff-ffff-ffffffffffff', 'P1', 1, 100, 99, 1, true);

INSERT INTO public.sessoes_jogo
  (id, evento_id, jogo, status, liberada_por,
   jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111',
   'ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
   (SELECT id FROM auth.users WHERE email='sm@altis.local'),
   'Maria', '54988887777', 'maria@x', 'aabbccdd-aabb-ccdd-eeff-001122334455');

SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (id, evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
     VALUES
       ('aaaa2222-aaaa-2222-aaaa-222222222222',
        'ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'Maria2', '54988887777', 'maria2@x', 'aabbccdd-aabb-ccdd-eeff-001122334455') $$,
  '%unq_jogada_tel_evento_jogo%',
  'UNIQUE bloqueia segundo telefone igual no mesmo evento+jogo finalizado'
);

-- Caso 4: Mesmo telefone em outro JOGO e OK
SELECT lives_ok(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dados', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'Maria3', '54988887777', 'maria3@x',
        'aabbccdd-aabb-ccdd-eeff-001122334455') $$,
  'mesmo telefone consegue jogar OUTRO jogo (dados) no mesmo evento'
);

-- Caso 5: UNIQUE evento ativo bloqueia 2 ativos
SELECT throws_like(
  $$ INSERT INTO public.eventos
       (nome, data_inicio, data_fim, status, criado_por)
     VALUES
       ('Outro evento', CURRENT_DATE, CURRENT_DATE+1, 'ativo',
        (SELECT id FROM auth.users WHERE email='sm@altis.local')) $$,
  '%unq_evento_ativo%',
  'UNIQUE unq_evento_ativo bloqueia 2 evento ativo'
);

SELECT * FROM finish();
ROLLBACK;
