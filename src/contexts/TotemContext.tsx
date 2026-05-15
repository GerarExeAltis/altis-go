'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { totemReducer, ESTADO_INICIAL, type TotemState, type TotemAction } from '@/lib/totem/stateMachine';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { liberarJogada, iniciarAnimacao, concluirAnimacao } from '@/lib/totem/edgeFunctions';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { PremioDb } from '@/lib/totem/types';

type TipoJogo = 'roleta' | 'dados';

interface PremioInfo {
  nome: string;
  e_premio_real: boolean;
  foto_path: string | null;
}

interface TotemContextValue {
  tipoJogo: TipoJogo;
  state: TotemState;
  dispatch: React.Dispatch<TotemAction>;
  premios: PremioDb[];
  jogadorNome: string | null;
  setJogadorNome: (v: string | null) => void;
  conectado: boolean;
  graceInicial: boolean;
  qrUrl: string;
  premioVencedorId: string | null;
  premioSorteado: PremioInfo | null;
  iniciando: boolean;
  tocar: () => Promise<void>;
  dispararJogo: () => Promise<void>;
  onAnimacaoConcluir: () => void;
}

const Ctx = React.createContext<TotemContextValue | null>(null);

export function useTotem(): TotemContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useTotem precisa estar dentro de <TotemProvider>');
  return v;
}

/**
 * Mapeia state.tipo -> sub-rota (relativa a baseRoute).
 * Funil do jogo:
 *   attract / criando_sessao / erro      -> baseRoute       (tela inicial)
 *   aguardando_celular / aguardando_dados -> baseRoute/qrcode
 *   pronta_para_girar / girando / finalizada -> baseRoute/jogar
 */
function rotaParaEstado(tipo: TotemState['tipo'], baseRoute: string): string {
  if (
    tipo === 'aguardando_celular' ||
    tipo === 'aguardando_dados'
  ) {
    return `${baseRoute}/qrcode`;
  }
  if (
    tipo === 'pronta_para_girar' ||
    tipo === 'girando' ||
    tipo === 'finalizada'
  ) {
    return `${baseRoute}/jogar`;
  }
  return baseRoute;
}

interface ProviderProps {
  tipoJogo: TipoJogo;
  /** Rota base ('/totem-roleta' ou '/totem-dados'). */
  baseRoute: string;
  children: React.ReactNode;
}

/**
 * Provider que mantem o state machine + efeitos do totem
 * compartilhados entre as 3 sub-rotas (attract, qrcode, jogar).
 *
 * Tambem sincroniza state.tipo -> router.push para que cada fase
 * do funil tenha sua URL real. Voltar/avancar do navegador fica
 * coerente com a fase do jogo (back de /jogar -> /qrcode -> base).
 */
export function TotemProvider({ tipoJogo, baseRoute, children }: ProviderProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? '';
  const router = useRouter();
  const pathname = usePathname();

  const [state, dispatch] = React.useReducer(totemReducer, ESTADO_INICIAL);

  // Expor state na window para o helper E2E happy-path.spec inspecionar
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __ALTIS_TOTEM_STATE__?: TotemState }).__ALTIS_TOTEM_STATE__ = state;
    }
  }, [state]);

  // Sincronizacao state -> rota. Quando state muda de fase, navega
  // pra rota correspondente. Usa replace pra nao acumular history
  // (back tem que respeitar o funil, nao revisitar estados ja
  // passados).
  React.useEffect(() => {
    const destino = rotaParaEstado(state.tipo, baseRoute);
    if (pathname !== destino) {
      router.replace(destino);
    }
  }, [state.tipo, baseRoute, pathname, router]);

  // Carrega premios do evento ativo no inicio ou apos retorno.
  const [premios, setPremios] = React.useState<PremioDb[]>([]);
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

  // Realtime — assina sessao a partir de aguardando_celular.
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

  // Nome do jogador (lookup quando muda para pronta_para_girar).
  const [jogadorNome, setJogadorNome] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar') return;
    const sb = getSupabaseBrowserClient();
    const sid = state.sessaoId;
    sb.from('sessoes_jogo').select('jogador_nome').eq('id', sid).single()
      .then(({ data }) => {
        if (data) setJogadorNome(data.jogador_nome);
      });
  }, [state.tipo, state]);

  // QR Code URL — inclui basePath para deploy em GitHub Pages.
  const qrUrl = React.useMemo(() => {
    if (state.tipo !== 'aguardando_celular' && state.tipo !== 'aguardando_dados') return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    return `${baseUrl}${basePath}/jogar/?s=${state.sessaoId}&t=${state.token}`;
  }, [state]);

  // tocar() — usuario inicia o jogo do attract.
  const tocar = React.useCallback(async () => {
    dispatch({ tipo: 'TOCAR' });
    try {
      const r = await liberarJogada(accessToken, tipoJogo);
      dispatch({
        tipo: 'SESSAO_CRIADA',
        sessaoId: r.sessao_id,
        token: r.token,
        expiraEm: r.expira_em,
      });
    } catch (e) {
      dispatch({ tipo: 'ERRO_REDE', mensagem: e instanceof Error ? e.message : 'falha de rede' });
    }
  }, [accessToken, tipoJogo]);

  // Disparar jogo — apos pronta_para_girar, chama Edge Function.
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

  const dispararJogo = React.useCallback(async () => {
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
    state.tipo === 'girando' ||
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'finalizada'
      ? state.premioId
      : null;

  const sessaoIdEstado =
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'girando' ||
    state.tipo === 'finalizada'
      ? state.sessaoId
      : null;

  const onAnimacaoConcluir = React.useCallback(() => {
    dispatch({ tipo: 'ANIMACAO_TERMINOU' });
    if (sessaoIdEstado) {
      concluirAnimacao(accessToken, sessaoIdEstado).catch(() => { /* idempotente */ });
    }
  }, [sessaoIdEstado, accessToken]);

  // Premio sorteado — info usada no modal final.
  const [premioSorteado, setPremioSorteado] = React.useState<PremioInfo | null>(null);
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
          setPremioSorteado(data as PremioInfo);
        }
      });
    return () => { alive = false; };
  }, [state]);

  const value: TotemContextValue = {
    tipoJogo,
    state,
    dispatch,
    premios,
    jogadorNome,
    setJogadorNome,
    conectado,
    graceInicial,
    qrUrl,
    premioVencedorId,
    premioSorteado,
    iniciando,
    tocar,
    dispararJogo,
    onAnimacaoConcluir,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
