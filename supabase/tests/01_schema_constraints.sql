BEGIN;

SELECT plan(34);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ ENUMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_type('public', 'sessao_status', 'enum sessao_status existe');
SELECT enum_has_labels('public', 'sessao_status',
  ARRAY['aguardando_celular','aguardando_dados','pronta_para_girar',
        'girando','finalizada','expirada','cancelada'],
  'sessao_status com 7 valores corretos');

SELECT has_type('public', 'jogo_tipo', 'enum jogo_tipo existe');
SELECT enum_has_labels('public', 'jogo_tipo',
  ARRAY['roleta','dados'],
  'jogo_tipo com 2 valores');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ TABELAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_table('public', 'perfis_operadores', 'tabela perfis_operadores existe');
SELECT has_table('public', 'admin_credenciais', 'tabela admin_credenciais existe');
SELECT has_table('public', 'lojas',             'tabela lojas existe');
SELECT has_table('public', 'eventos',           'tabela eventos existe');
SELECT has_table('public', 'premios',           'tabela premios existe');
SELECT has_table('public', 'sessoes_jogo',      'tabela sessoes_jogo existe');
SELECT has_table('public', 'ganhadores',        'tabela ganhadores existe');
SELECT has_table('public', 'fingerprints_bloqueados', 'tabela fingerprints_bloqueados existe');
SELECT has_table('public', 'auditoria',         'tabela auditoria existe');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ CONSTRAINTS ━━━━━━━━━━━━━━━━━━━━━━━━━

-- admin_credenciais: singleton (id=1)
SELECT col_has_check('public', 'admin_credenciais', 'id', 'admin_credenciais.id tem CHECK');

-- eventos: status válido + datas
SELECT col_has_check('public', 'eventos', 'status', 'eventos.status tem CHECK');

-- só 1 evento ativo
SELECT has_index('public', 'eventos', 'unq_evento_ativo', 'indice unico parcial em status=ativo');

-- premios: pesos nao-negativos + estoque coerente
SELECT col_has_check('public', 'premios', 'peso_base', 'premios.peso_base tem CHECK');
SELECT col_has_check('public', 'premios', 'estoque_inicial', 'premios.estoque_inicial tem CHECK');
SELECT col_has_check('public', 'premios', 'estoque_atual', 'premios.estoque_atual tem CHECK');

-- sessoes_jogo: anti-fraude estrutural
SELECT has_index('public', 'sessoes_jogo', 'unq_jogada_tel_evento_jogo',
                 'indice unico parcial telefone+evento+jogo em status finalizados');

-- sessoes_jogo: dados obrigatorios quando pronta
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint
           WHERE conname = 'dados_quando_pronta'
             AND conrelid = 'public.sessoes_jogo'::regclass),
  'sessoes_jogo tem CHECK dados_quando_pronta'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint
           WHERE conname = 'premio_quando_finalizada'
             AND conrelid = 'public.sessoes_jogo'::regclass),
  'sessoes_jogo tem CHECK premio_quando_finalizada'
);

-- ganhadores: 1 ganhador por sessao (FK + UNIQUE)
SELECT col_is_unique('public', 'ganhadores', 'sessao_id',
                     'ganhadores.sessao_id e UNIQUE');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ FOREIGN KEYS ━━━━━━━━━━━━━━━━━━━━━━━━

SELECT fk_ok('public', 'premios', 'evento_id', 'public', 'eventos', 'id',
             'premios.evento_id -> eventos.id');
SELECT fk_ok('public', 'sessoes_jogo', 'evento_id', 'public', 'eventos', 'id',
             'sessoes_jogo.evento_id -> eventos.id');
SELECT fk_ok('public', 'sessoes_jogo', 'premio_sorteado_id', 'public', 'premios', 'id',
             'sessoes_jogo.premio_sorteado_id -> premios.id');
SELECT fk_ok('public', 'ganhadores', 'sessao_id', 'public', 'sessoes_jogo', 'id',
             'ganhadores.sessao_id -> sessoes_jogo.id');
SELECT fk_ok('public', 'ganhadores', 'evento_id', 'public', 'eventos', 'id',
             'ganhadores.evento_id -> eventos.id');
SELECT fk_ok('public', 'ganhadores', 'premio_id', 'public', 'premios', 'id',
             'ganhadores.premio_id -> premios.id');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ INDICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_index('public', 'sessoes_jogo', 'idx_sess_evento_status', 'indice composto evento+status');
SELECT has_index('public', 'sessoes_jogo', 'idx_sess_expira', 'indice em expira_em parcial');
SELECT has_index('public', 'ganhadores',   'idx_ganh_evento', 'indice em evento_id');
SELECT has_index('public', 'ganhadores',   'idx_ganh_telefone', 'indice em telefone');
SELECT has_index('public', 'auditoria',    'idx_audit_data', 'indice em criado_em DESC');

SELECT * FROM finish();
ROLLBACK;
