-- 00_setup.sql — pgTAP setup global do projeto Altis Bet.
-- Cada arquivo de teste roda dentro do próprio BEGIN/ROLLBACK; este arquivo
-- só garante que a extensão pgTAP está disponível e funciona.
-- pgTAP exige ao menos 1 teste por arquivo, daí o assert trivial abaixo.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(1);
SELECT ok(true, 'pgtap carregada com sucesso');
SELECT * FROM finish();

ROLLBACK;
