-- 00_setup.sql — pgTAP setup global do projeto Altis Bet.
-- Carregado antes dos arquivos de teste numerados (01_, 02_, etc).
-- Cada arquivo de teste roda dentro do próprio BEGIN/ROLLBACK; este arquivo
-- apenas garante que a extensão pgTAP está disponível no banco.

CREATE EXTENSION IF NOT EXISTS pgtap;
