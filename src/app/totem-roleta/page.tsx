'use client';

import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { totemReducer, ESTADO_INICIAL, bloqueiaSaidaTotem } from '@/lib/totem/stateMachine';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { useVoltarParaAttract } from '@/hooks/useVoltarParaAttract';
import { ModalConfirmacaoVoltar } from '@/components/totem/ModalConfirmacaoVoltar';
import { liberarJogada, iniciarAnimacao, concluirAnimacao } from '@/lib/totem/edgeFunctions';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { PremioDb } from '@/lib/totem/types';
import { AttractMode } from '@/components/totem/AttractMode';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { ModalResultadoPremio } from '@/components/jogos/ModalResultadoPremio';
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

  // Bloqueio com senha admin durante o jogo (pronta_para_girar+).
  const bloqueio = useBloqueioSaidaTotem(bloqueiaSaidaTotem(state));

  // Em QR Code (aguardando_celular/aguardando_dados): voltar do
  // browser cancela a sessao e volta pra ATTRACT — em vez de sair
  // pra /login ou /. As fases formam um funil:
  // attract -> qr -> jogo. Voltar respeita esse funil.
  useVoltarParaAttract(
    state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados',
    React.useCallback(() => dispatch({ tipo: 'RESET' }), []),
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __ALTIS_TOTEM_STATE__?: typeof state }).__ALTIS_TOTEM_STATE__ = state;
    }
  }, [state]);

  const [premios, setPremios] = React.useState<PremioDb[]>([]);
  const [jogadorNome, setJogadorNome] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.tipo !== 'attract' && state.tipo !== 'criando_sessao') return;
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      const { data: evt } = await sb
        .from('eventos').select('id').eq('status', 'ativo').maybeSingle();
      if (!evt || !alive) return;
      const { data } = await sb.from('premios')
        .select('id,nome,foto_path,ordem_roleta,e_premio_real,estoque_atual,peso_base')
        .eq('evento_id', evt.id)
        .order('ordem_roleta', { ascending: true })
        .order('id', { ascending: true }); // desempate determinista (igual ao sortear() SQL)
      if (alive && data) setPremios(data as PremioDb[]);
    })();
    return () => { alive = false; };
  }, [state.tipo]);

  const sessaoId =
    state.tipo === 'aguardando_celular' ||
    state.tipo === 'aguardando_dados' ||
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'girando' ||
    state.tipo === 'finalizada'
      ? state.sessaoId
      : null;

  const { payload, conectado } = useSessaoRealtime(sessaoId);

  const [graceInicial, setGraceInicial] = React.useState(true);
  React.useEffect(() => {
    if (state.tipo !== 'aguardando_celular' && state.tipo !== 'aguardando_dados') {
      setGraceInicial(true); // re-arma para a proxima entrada
      return;
    }
    setGraceInicial(true);
    const id = window.setTimeout(() => setGraceInicial(false), 3000);
    return () => window.clearTimeout(id);
  }, [state.tipo]);

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
  const [iniciando, setIniciando] = React.useState(false);

  React.useEffect(() => {
    if (
      state.tipo === 'attract' ||
      state.tipo === 'criando_sessao' ||
      state.tipo === 'aguardando_celular' ||
      state.tipo === 'aguardando_dados'
    ) {
      iniciouRef.current = null;
      setIniciando(false);
    }
  }, [state.tipo]);

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

  // URL do QR precisa incluir basePath (em prod = /altis-go) e
  // trailing slash (next.config tem trailingSlash:true). Sem isso o
  // celular abre uma URL fora do escopo do site e o GitHub Pages
  // responde 404.
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const qrUrl =
    state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados'
      ? `${baseUrl}${basePath}/jogar/?s=${state.sessaoId}&t=${state.token}`
      : '';

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

  let conteudo: React.ReactNode = null;

  if (state.tipo === 'erro') {
    conteudo = <ErroOverlay mensagem={state.mensagem} />;
  } else if (state.tipo === 'attract' || state.tipo === 'criando_sessao') {
    conteudo = (
      <AttractMode
        onTocar={tocar}
        disabled={state.tipo === 'criando_sessao'}
        premios={premios}
      />
    );
  } else if (state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados') {
    conteudo = (!conectado && !graceInicial)
      ? <ErroOverlay mensagem="Aguardando conexão com servidor..." />
      : (
        <QrCodeScreen
          url={qrUrl}
          expiraEm={state.expiraEm}
          aguardandoDados={state.tipo === 'aguardando_dados'}
        />
      );
  } else if (
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'girando' ||
    state.tipo === 'finalizada'
  ) {
    const aguardandoToque = state.tipo === 'pronta_para_girar';
    conteudo = (
      <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-background">
        <h2 className="p-6 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        <div className="h-full w-full">
          <RoletaCanvas premios={premios} rodaRef={rodaRef} />
        </div>
        <div className="flex items-center justify-center p-6">
          {aguardandoToque && (
            <button
              type="button"
              onClick={dispararRoleta}
              disabled={iniciando}
              className="inline-flex h-20 items-center justify-center gap-3 rounded-2xl bg-primary px-16 text-3xl font-bold text-primary-foreground shadow-2xl shadow-primary/40 ring-2 ring-primary/40 transition-all hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              aria-label="Girar a roleta"
            >
              GIRAR
            </button>
          )}
        </div>

        {state.tipo === 'finalizada' && premioSorteado && (
          <ModalResultadoPremio
            premioNome={premioSorteado.nome}
            ePremioReal={premioSorteado.e_premio_real}
            premioFotoPath={premioSorteado.foto_path}
            jogadorNome={jogadorNome}
            onFinalizar={() => {
              setJogadorNome(null);
              dispatch({ tipo: 'AUTO_RETORNO' });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {conteudo}
      <ModalConfirmacaoVoltar
        open={bloqueio.modalAberto}
        onCancelar={bloqueio.fecharModal}
        // "Sim, voltar" cancela a sessao e devolve o totem pra attract,
        // sem sair da rota. Proximo jogador comeca limpo.
        onConfirmar={() => bloqueio.liberar(() => dispatch({ tipo: 'RESET' }))}
      />
    </>
  );
}