'use client';
import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { totemReducer, ESTADO_INICIAL } from '@/lib/totem/stateMachine';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { liberarJogada, iniciarAnimacao, concluirAnimacao } from '@/lib/totem/edgeFunctions';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { PremioDb } from '@/lib/totem/types';
import { AttractMode } from '@/components/totem/AttractMode';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { AguardandoDados } from '@/components/totem/AguardandoDados';
import { BannerGanhador } from '@/components/totem/BannerGanhador';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import { usarAnimacaoRoleta } from '@/components/totem/roleta/usarAnimacaoRoleta';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

export default function TotemPage() {
  return (
    <AuthGuard>
      <TotemFlow />
    </AuthGuard>
  );
}

function TotemFlow() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? '';
  const [state, dispatch] = React.useReducer(totemReducer, ESTADO_INICIAL);
  const { reduzir } = usePreferredMotion();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __ALTIS_TOTEM_STATE__?: typeof state }).__ALTIS_TOTEM_STATE__ = state;
    }
  }, [state]);

  const [premios, setPremios] = React.useState<PremioDb[]>([]);
  const [jogadorNome, setJogadorNome] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      const { data: evt } = await sb
        .from('eventos').select('id').eq('status', 'ativo').maybeSingle();
      if (!evt || !alive) return;
      const { data } = await sb.from('premios')
        .select('id,nome,cor_hex,foto_path,ordem_roleta,e_premio_real,estoque_atual,peso_base')
        .eq('evento_id', evt.id)
        .order('ordem_roleta', { ascending: true });
      if (alive && data) setPremios(data as PremioDb[]);
    })();
    return () => { alive = false; };
  }, []);

  const sessaoId =
    state.tipo === 'aguardando_celular' ||
    state.tipo === 'aguardando_dados' ||
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'girando' ||
    state.tipo === 'finalizada'
      ? state.sessaoId
      : null;

  const { payload, conectado } = useSessaoRealtime(sessaoId);

  React.useEffect(() => {
    if (!payload) return;
    dispatch({
      tipo: 'REALTIME_STATUS',
      status: payload.status,
      premioId: payload.premio_sorteado_id,
    });
  }, [payload]);

  const tocar = React.useCallback(async () => {
    dispatch({ tipo: 'TOCAR' });
    try {
      const r = await liberarJogada(accessToken, 'roleta');
      dispatch({
        tipo: 'SESSAO_CRIADA',
        sessaoId: r.sessao_id,
        token: r.token,
        expiraEm: r.expira_em,
      });
    } catch (e) {
      dispatch({ tipo: 'ERRO_REDE', mensagem: e instanceof Error ? e.message : 'falha de rede' });
    }
  }, [accessToken]);

  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar') return;
    const sb = getSupabaseBrowserClient();
    const sid = state.sessaoId;
    sb.from('sessoes_jogo').select('jogador_nome').eq('id', sid).single()
      .then(({ data }) => {
        if (data) setJogadorNome(data.jogador_nome);
      });
  }, [state.tipo, state]);

  const iniciouRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar') return;
    if (iniciouRef.current === state.sessaoId) return;
    iniciouRef.current = state.sessaoId;
    iniciarAnimacao(accessToken, state.sessaoId).catch((e) =>
      dispatch({ tipo: 'ERRO_REDE', mensagem: e.message })
    );
  }, [state, accessToken]);

  const premioVencedorId =
    state.tipo === 'girando' || state.tipo === 'pronta_para_girar' || state.tipo === 'finalizada'
      ? state.premioId
      : null;

  const sessaoIdEstado =
    state.tipo === 'pronta_para_girar' || state.tipo === 'girando' || state.tipo === 'finalizada'
      ? state.sessaoId
      : null;

  const onAnimacaoConcluir = React.useCallback(() => {
    dispatch({ tipo: 'ANIMACAO_TERMINOU' });
    if (sessaoIdEstado) {
      concluirAnimacao(accessToken, sessaoIdEstado).catch(() => {
        /* idempotente */
      });
    }
  }, [sessaoIdEstado, accessToken]);

  const { rodaRef, iniciar } = usarAnimacaoRoleta({
    premios,
    premioVencedorId,
    reduzir,
    onConcluir: onAnimacaoConcluir,
  });

  React.useEffect(() => {
    if (state.tipo === 'girando') iniciar();
  }, [state.tipo, iniciar]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl =
    state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados'
      ? `${baseUrl}/jogar?s=${state.sessaoId}&t=${state.token}`
      : '';

  const premioSorteado = premios.find((p) => p.id === premioVencedorId);

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  if (state.tipo === 'attract' || state.tipo === 'criando_sessao') {
    return <AttractMode onTocar={tocar} disabled={state.tipo === 'criando_sessao'} />;
  }

  if (state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados') {
    if (!conectado) {
      return <ErroOverlay mensagem="Aguardando conexão com servidor..." />;
    }
    return (
      <QrCodeScreen
        url={qrUrl}
        expiraEm={state.expiraEm}
        aguardandoDados={state.tipo === 'aguardando_dados'}
      />
    );
  }

  if (state.tipo === 'pronta_para_girar') {
    return <AguardandoDados nome={jogadorNome} />;
  }

  if (state.tipo === 'girando') {
    return (
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background">
        <h2 className="p-8 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        <div className="h-full w-full">
          <RoletaCanvas premios={premios} rodaRef={rodaRef} />
        </div>
      </div>
    );
  }

  if (state.tipo === 'finalizada' && premioSorteado) {
    return (
      <BannerGanhador
        premioNome={premioSorteado.nome}
        ePremioReal={premioSorteado.e_premio_real}
        jogadorNome={jogadorNome}
        onVoltar={() => {
          setJogadorNome(null);
          dispatch({ tipo: 'AUTO_RETORNO' });
        }}
      />
    );
  }

  return null;
}
