BEGIN;

SELECT plan(4);

SELECT has_function('private', 'is_admin', ARRAY[]::TEXT[],
                    'funcao private.is_admin() sem args existe');

-- Caso 1: sem JWT (anonimo) -> false
SET LOCAL request.jwt.claims TO '{}';
SELECT is(private.is_admin(), false, 'is_admin() retorna false quando nao ha claim');

-- Caso 2: JWT com admin_elevado=false -> false
SET LOCAL request.jwt.claims TO '{"admin_elevado": false}';
SELECT is(private.is_admin(), false, 'is_admin() retorna false quando admin_elevado=false');

-- Caso 3: JWT com admin_elevado=true -> true
SET LOCAL request.jwt.claims TO '{"admin_elevado": true}';
SELECT is(private.is_admin(), true, 'is_admin() retorna true quando admin_elevado=true');

SELECT * FROM finish();
ROLLBACK;
