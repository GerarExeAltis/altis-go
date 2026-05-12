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
  ARRAY['le_operadores','admin_insert_operadores','admin_update_operadores','admin_delete_operadores'],
  'perfis_operadores tem 4 policies (le + admin INS/UPD/DEL)');

SELECT policies_are('public', 'admin_credenciais',
  ARRAY['admin_atualiza_senha'],
  'admin_credenciais tem policy de UPDATE');

SELECT policies_are('public', 'lojas',
  ARRAY['le_lojas','admin_insert_lojas','admin_update_lojas','admin_delete_lojas'],
  'lojas tem 4 policies');

SELECT policies_are('public', 'eventos',
  ARRAY['le_eventos','admin_insert_eventos','admin_update_eventos','admin_delete_eventos'],
  'eventos tem 4 policies');

SELECT policies_are('public', 'premios',
  ARRAY['le_premios','admin_insert_premios','admin_update_premios','admin_delete_premios'],
  'premios tem 4 policies');

SELECT policies_are('public', 'sessoes_jogo',
  ARRAY['operador_le_sessoes','operador_atualiza_propria_sessao'],
  'sessoes_jogo tem 2 policies (anon nao)');

SELECT policies_are('public', 'ganhadores',
  ARRAY['operador_le_ganhadores','operador_marca_entrega'],
  'ganhadores tem 2 policies');

SELECT policies_are('public', 'fingerprints_bloqueados',
  ARRAY['admin_le_fingerprints','admin_insert_fingerprints','admin_update_fingerprints','admin_delete_fingerprints'],
  'fingerprints_bloqueados tem 4 policies admin');

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
