# Altis Bet — Operação e Monitoramento

## UptimeRobot (uptime monitoring gratuito)

1. Criar conta em [uptimerobot.com](https://uptimerobot.com) (free tier 50 monitors).
2. **Add New Monitor** → tipo **HTTP(s)**.
3. URL: `https://<usuario>.github.io/altis-bet/login`.
4. Interval: 5 minutos.
5. Alert contacts: e-mail/SMS do admin Altis.

Também recomendado:
- URL Supabase: `https://xxx.supabase.co/rest/v1/?apikey=<anon>` (espera 200).

## Sentry (captura de erros)

1. Criar projeto em [sentry.io](https://sentry.io) (free tier 5K events/mês).
2. Pegar DSN (Settings → Client Keys).
3. Adicionar como secret `NEXT_PUBLIC_SENTRY_DSN` no GitHub.
4. Re-deploy `main` para incluir o DSN no build.

Sentry remove PII (telefones, e-mails) automaticamente antes de enviar — vide `src/sentry.client.config.ts`.

## Backup

Opcional — criar `.github/workflows/backup-diario.yml`:

```yaml
on:
  schedule: [{ cron: '0 5 * * *' }]
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --legacy-peer-deps
      - run: |
          SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }} \
          SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY_PROD }} \
          npm run cli -- backup --saida ./backups/$(date +%F)
      - uses: actions/upload-artifact@v4
        with:
          name: backup-${{ github.run_number }}
          path: backups/
          retention-days: 90
```

> Supabase Cloud já faz backup diário automático (7d free, 30d Pro).

## Runbook — incidentes comuns

### "Nenhum evento ativo" no totem
Admin → /admin → Eventos → criar/ativar um evento.

### Cliente reclama que não consegue jogar
1. Verificar telefone digitado (DDD válido?)
2. Conferir se já jogou antes (telefone duplicado retorna 409 amigável)
3. Verificar fingerprint bloqueado em Admin → Configurações

### Roleta não gira no totem
1. Verificar conexão Supabase Realtime (canto direito do header)
2. Refresh do navegador
3. Conferir status da sessão no Supabase Studio (`/sessoes_jogo`)

### Edge Function retorna 429 (rate limit admin)
Modo admin bloqueado por 30min após 5 falhas. Esperar ou limpar manualmente:
```sql
DELETE FROM auditoria WHERE acao='admin_login_falhou' AND ip='<IP>';
```

### Resetar senha admin (esqueceu)
```bash
npx altis-bet definir-senha-admin
# (com .env.local apontando pra produção)
```

## Custos esperados

| Serviço | Plano | Custo/mês |
|---|---|---|
| Supabase | Free → Pro $25 (se >500MB DB ou >1GB storage) | R$ 0 – R$ 140 |
| GitHub Pages | Free público | R$ 0 |
| Sentry | Free 5K events | R$ 0 |
| UptimeRobot | Free 50 monitors | R$ 0 |
| Domínio custom | Anual | ~R$ 50/ano |
| **Total inicial** | | **R$ 0 – R$ 140/mês** |
