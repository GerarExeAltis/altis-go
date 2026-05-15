'use client';

import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { totemReducer, ESTADO_INICIAL } from '@/lib/totem/stateMachine';
import { useRouter } from 'next/navigation';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { ModalSaidaTotem } from '@/components/totem/ModalSaidaTotem';
import { liberarJogada, iniciarAnimacao, concluirAnimacao } from '@/lib/totem/edgeFunctions';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { PremioDb } from '@/lib/totem/types';
import { AttractModeDados } from '@/components/totem/AttractModeDados';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { ModalResultadoPremio } from '@/components/jogos/ModalResultadoPremio';
import { SwipeAreaDados } from '@/components/totem/dados/SwipeAreaDados';
import { CarrosselPremios } from '@/components/totem/dados/CarrosselPremios';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

export default function TotemDadosPage() {
  return (
    <AuthGuard>
      <TotemDadosFlow />
    </AuthGuard>
  );
}

function TotemDadosFlow() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? '';
  const [state, dispatch] = React.useReducer(totemReducer, ESTADO_INICIAL);
  const { reduzir } = usePreferredMotion();

  const bloqueio = useBloqueioSaidaTotem(true);

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
        .order('id', { ascending: true });
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
      setGraceInicial(true);
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
      const r = await liberarJogada(accessToken, 'dados');
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

  const dispararDado = React.useCallback(async () => {
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

  // Flag local "dados acabaram de pousar". Eh setada imediatamente
  // no onConcluir do MotorFisicaDados; aciona o highlight do card
  // vencedor no carrossel. Reseta quando o totem volta para attract.
  const [dadosPousaram, setDadosPousaram] = React.useState(false);

  const onAnimacaoConcluir = React.useCallback(() => {
    // Marca imediatamente que os dados pousaram — o carrossel
    // reage centralizando + destacando o card do premio vencedor.
    setDadosPousaram(true);

    // Aguarda 2.5s antes de abrir o modal. Nesse intervalo o jogador:
    //   1. ve os dados parados nas faces finais
    //   2. ve o carrossel rolar suavemente e parar no SEU premio
    //   3. ve o glow pulsante no card vencedor
    // SO ENTAO o modal final aparece.
    const TEMPO_VITRINE_MS = 2500;
    window.setTimeout(() => {
      dispatch({ tipo: 'ANIMACAO_TERMINOU' });
      if (sessaoIdEstado) {
        concluirAnimacao(accessToken, sessaoIdEstado).catch(() => { /* idempotente */ });
      }
    }, TEMPO_VITRINE_MS);
  }, [sessaoIdEstado, accessToken]);

  // Reset do "dadosPousaram" ao sair da finalizacao — proximo round
  // comeca limpo, com carrossel rolando normalmente.
  React.useEffect(() => {
    if (
      state.tipo === 'attract' ||
      state.tipo === 'criando_sessao' ||
      state.tipo === 'aguardando_celular' ||
      state.tipo === 'aguardando_dados' ||
      state.tipo === 'pronta_para_girar'
    ) {
      setDadosPousaram(false);
    }
  }, [state.tipo]);

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
      <AttractModeDados
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
      <div className="grid min-h-screen w-full min-w-0 grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-background">
        <h2 className="px-6 pt-6 pb-2 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        {/* Carrossel de premios — logo abaixo do nome do jogador,
            compacto. Comunica ao jogador exatamente que combinacao
            de dados ganha cada premio. */}
        <div className="min-w-0 overflow-hidden pb-2">
          <CarrosselPremios
            premios={premios}
            velocidade={50}
            alturaCard={100}
            visiveis={5}
            // Highlight do vencedor: SO quando os dados ja pousaram.
            // Antes disso, vencedorId=null e o carrossel rola normal.
            vencedorId={dadosPousaram ? premioVencedorId : null}
          />
        </div>
        <SwipeAreaDados
          aguardandoToque={aguardandoToque}
          iniciando={iniciando}
          onLancar={dispararDado}
          iniciarLance={state.tipo === 'girando'}
          premios={premios}
          premioVencedorId={premioVencedorId}
          reduzirMovimento={reduzir}
          onConcluir={onAnimacaoConcluir}
        />
        <div className="flex items-center justify-center px-6 pb-6 pt-2">
          {aguardandoToque && (
            <p className="text-lg font-medium text-muted-foreground animate-[attract-glow_2.4s_ease-in-out_infinite]">
              {iniciando ? 'Rolando...' : '🎲 Toque na tela para lançar'}
            </p>
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
      <ModalSaidaTotem
        open={bloqueio.modalAberto}
        onCancelar={bloqueio.fecharModal}
        onLiberar={() => bloqueio.liberar(() => router.push('/'))}
      />
    </>
  );
}
