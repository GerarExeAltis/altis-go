-- 20260511120006_pg_cron_jobs.sql
-- Jobs de manutencao automatica (executados pelo Supabase managed pg_cron).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: expirar sessoes vencidas (a cada 60s)
SELECT cron.schedule(
  'expirar-sessoes-vencidas',
  '* * * * *',
  $$
    UPDATE public.sessoes_jogo
       SET status = 'expirada'
     WHERE expira_em < NOW()
       AND status IN ('aguardando_celular', 'aguardando_dados');
  $$
);

-- Job 2: destravar sessoes em 'girando' por mais de 30s (totem crashou)
SELECT cron.schedule(
  'destravar-girando-perdidas',
  '* * * * *',
  $$
    UPDATE public.sessoes_jogo
       SET status = 'finalizada',
           finalizada_em = NOW()
     WHERE status = 'girando'
       AND girada_em < NOW() - INTERVAL '30 seconds';
  $$
);

-- Job 3: cleanup de sessoes antigas (a cada hora; so remove >30 dias)
SELECT cron.schedule(
  'cleanup-sessoes-antigas',
  '0 * * * *',
  $$
    DELETE FROM public.sessoes_jogo
     WHERE status IN ('expirada', 'cancelada')
       AND criada_em < NOW() - INTERVAL '30 days';
  $$
);
