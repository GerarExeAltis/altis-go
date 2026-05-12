BEGIN;

SELECT plan(19);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ RLS HABILITADA ━━━━━━━━━━━━━━━━━━━━━━━

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.perfis_operadores'::regclass),
  'RLS habilitada em perfis_operadores'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_credenciais'::regclass),
  'RLS habilitada em admin_credenciais'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.lojas'::regclass),
  'RLS habilitada em lojas'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.eventos'::regclass),
  'RLS habilitada em eventos'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.premios'::regclass),
  'RLS habilitada em premios'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.sessoes_jogo'::regclass),
  'RLS habilitada em sessoes_jogo'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ganhadores'::regclass),
  'RLS habilitada em ganhadores'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.fingerprints_bloqueados'::regclass),
  'RLS habilitada em fingerprints_bloqueados'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.auditoria'::regclass),
  'RLS habilitada em auditoria'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ POLICIES EXISTEM ━━━━━━━━━━━━━━━━━━━━━

SELECT policies_are('public', 'perfis_operadores',
  ARRAY['operador_ve_proprio','admin_ve_todos_operadores'],
  'perfis_operadores tem policies certas');

SELECT policies_are('public', 'admin_credenciais',
  ARRAY['admin_atualiza_senha'],
  'admin_credenciais tem policy de UPDATE');

SELECT policies_are('public', 'lojas',
  ARRAY['operador_le_lojas','admin_cud_lojas'],
  'lojas tem 2 policies');

SELECT policies_are('public', 'eventos',
  ARRAY['operador_le_eventos','admin_cud_eventos'],
  'eventos tem 2 policies');

SELECT policies_are('public', 'premios',
  ARRAY['operador_le_premios','admin_cud_premios'],
  'premios tem 2 policies');

SELECT policies_are('public', 'sessoes_jogo',
  ARRAY['operador_le_sessoes','operador_atualiza_propria_sessao'],
  'sessoes_jogo tem 2 policies (anon nao)');

SELECT policies_are('public', 'ganhadores',
  ARRAY['operador_le_ganhadores','operador_marca_entrega'],
  'ganhadores tem 2 policies');

SELECT policies_are('public', 'fingerprints_bloqueados',
  ARRAY['admin_gerencia_fingerprints'],
  'fingerprints_bloqueados tem 1 policy admin');

SELECT policies_are('public', 'auditoria',
  ARRAY['admin_le_auditoria'],
  'auditoria tem 1 policy SELECT admin');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ SEMANTICA RAPIDA ━━━━━━━━━━━━━━━━━━━━━

-- anon nao ve sessoes mesmo conhecendo o ID
SET LOCAL ROLE anon;
SELECT is_empty(
  $$ SELECT 1 FROM public.sessoes_jogo LIMIT 1 $$,
  'anon nao consegue ver sessoes_jogo (sem policy)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
