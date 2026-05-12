-- 20260512200001_realtime_sessoes_jogo.sql
-- Adiciona public.sessoes_jogo a publicacao supabase_realtime
-- (necessario para o totem/celular receberem eventos via Supabase Realtime).
--
-- Sem isso: o totem fica preso em "aguardando_celular" mesmo apos o
-- celular submeter dados, e o celular fica preso em "Aguarde" mesmo
-- apos o totem terminar a animacao — porque os UPDATEs no Postgres
-- existem mas o supabase_realtime ignora a tabela.
--
-- REPLICA IDENTITY FULL garante que payloads de UPDATE incluam todas
-- as colunas (necessario para hooks que leem premio_sorteado_id no
-- evento, nao so as colunas alteradas).

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessoes_jogo;
ALTER TABLE public.sessoes_jogo REPLICA IDENTITY FULL;
