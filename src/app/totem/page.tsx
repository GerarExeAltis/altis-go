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
        .select('id,nome,foto_path,ordem_roleta,e_premio_real,estoque_atual,peso_base')
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

  // Cliente (pessoa em frente ao totem) inicia a roleta tocando no botao
  // GIRAR — sem auto-disparo. O botao aparece embaixo da roleta no estado
  // 'pronta_para_girar'. iniciarAnimacao muda status para 'girando' no banco,
  // useSessaoRealtime atualiza state e o useEffect abaixo dispara iniciar().
  const iniciouRef = React.useRef<string | null>(null);
  const [iniciando, setIniciando] = React.useState(false);
  const dispararRoleta = React.useCallback(async () => {
    if (state.tipo !== 'pronta_para_girar') return;
    if (iniciouRef.current === state.sessaoId) return;
    iniciouRef.current = state.sessaoId;
    setIniciando(true);
    try {
      await iniciarAnimacao(accessToken, state.sessaoId);
    } catch (e) {
      iniciouRef.current = null;
      setIniciando(false);
      dispatch({ tipo: 'ERRO_REDE', mensagem: (e as Error).message });
    }
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

  // Busca o nome do premio sorteado DIRETO DO BANCO (fonte da verdade)
  // quando entramos em 'finalizada'. Antes usavamos premios.find(...) no
  // array carregado uma vez no mount, mas se o admin renomear premios
  // enquanto o totem esta aberto, o totem mostrava o nome antigo —
  // divergindo do que o celular ve via obter-sessao (que busca a cada QR).
  const [premioSorteado, setPremioSorteado] = React.useState<
    { nome: string; e_premio_real: boolean; foto_path: string | null } | null
  >(null);

  React.useEffect(() => {
    if (state.tipo !== 'finalizada' || !state.premioId) {
      setPremioSorteado(null);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const pid = state.premioId;
    let alive = true;
    sb.from('premios')
      .select('nome, e_premio_real, foto_path')
      .eq('id', pid)
      .single()
      .then(({ data }) => {
        if (alive && data) {
          setPremioSorteado(data as { nome: string; e_premio_real: boolean; foto_path: string | null });
        }
      });
    return () => { alive = false; };
  }, [state]);

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

  if (state.tipo === 'pronta_para_girar' || state.tipo === 'girando') {
    const aguardandoToque = state.tipo === 'pronta_para_girar';
    return (
      <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-background">
        <h2 className="p-6 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        <div className="h-full w-full">
          <RoletaCanvas premios={premios} rodaRef={rodaRef} />
        </div>
        <div className="flex items-center justify-center p-6">
          {aguardandoToque ? (
            <button
              type="button"
              onClick={dispararRoleta}
              disabled={iniciando}
              className="inline-flex h-20 items-center justify-center gap-3 rounded-2xl bg-primary px-16 text-3xl font-bold text-primary-foreground shadow-2xl shadow-primary/40 ring-2 ring-primary/40 transition-all hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              aria-label="Girar a roleta"
            >
              {iniciando ? 'GIRANDO...' : 'GIRAR'}
            </button>
          ) : (
            <p className="animate-pulse text-2xl font-semibold text-primary">Girando...</p>
          )}
        </div>
      </div>
    );
  }

  if (state.tipo === 'finalizada' && premioSorteado) {
    return (
      <BannerGanhador
        premioNome={premioSorteado.nome}
        ePremioReal={premioSorteado.e_premio_real}
        premioFotoPath={premioSorteado.foto_path}
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
