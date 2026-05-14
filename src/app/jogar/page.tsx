'use client';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { obterSessao, submeterDados } from '@/lib/jogar/edgeFunctions';
import type { ObterSessaoResp } from '@/lib/jogar/types';
import { useFingerprint } from '@/hooks/useFingerprint';
import { usePollingStatus } from '@/hooks/usePollingStatus';
import { FormJogador, type DadosForm } from '@/components/jogar/FormJogador';
import { CatalogoPremios } from '@/components/jogar/CatalogoPremios';
import { AguardandoTotem } from '@/components/jogar/AguardandoTotem';
import { ResultadoJogador } from '@/components/jogar/ResultadoJogador';
import { ErroSessao } from '@/components/jogar/ErroSessao';
import { LogoAltis } from '@/components/LogoAltis';
import { Loader2 } from 'lucide-react';

type Fase = 'carregando' | 'form' | 'aguardando' | 'finalizado' | 'erro';

interface ErroState {
  titulo: string;
  mensagem: string;
}

export default function JogarPage() {
  return (
    <React.Suspense fallback={<TelaCarregando />}>
      <Jogar />
    </React.Suspense>
  );
}

function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <LogoAltis size={64} />
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}

function Jogar() {
  const params = useSearchParams();
  const s = params.get('s');
  const t = params.get('t');

  const [fase, setFase] = React.useState<Fase>('carregando');
  const [sessao, setSessao] = React.useState<ObterSessaoResp | null>(null);
  const [erro, setErro] = React.useState<ErroState | null>(null);
  const [nome, setNome] = React.useState<string>('');
  const [enviando, setEnviando] = React.useState(false);

  const { fingerprint } = useFingerprint();

  React.useEffect(() => {
    if (!s || !t) {
      setErro({
        titulo: 'Link inválido',
        mensagem: 'Toque na tela do totem para gerar um QR Code válido.',
      });
      setFase('erro');
      return;
    }
    obterSessao(s, t).then(
      (resp) => {
        setSessao(resp);
        setFase('form');
      },
      (e) => {
        const msg = (e as Error).message ?? '';
        if (msg.includes('UNAUTHORIZED')) {
          setErro({
            titulo: 'Sessão expirada',
            mensagem: 'Volte ao totem e toque novamente para gerar um QR Code novo.',
          });
        } else if (msg.includes('CONFLICT')) {
          setErro({
            titulo: 'Sessão já usada',
            mensagem: 'Esta jogada foi feita ou está em uso por outro celular.',
          });
        } else {
          setErro({
            titulo: 'Erro ao abrir sessão',
            mensagem: 'Tente novamente em alguns segundos.',
          });
        }
        setFase('erro');
      }
    );
  }, [s, t]);

  // Polling do status enquanto a sessao esta viva (form ja submetido).
  // Nao usamos Realtime porque o celular e anon e a RLS de sessoes_jogo
  // so libera SELECT para authenticated — Realtime postgres_changes
  // aplica RLS e nao entrega events. obter-status e PII-safe.
  const pollingAtivo = fase === 'aguardando' || fase === 'finalizado';
  const { status: payload } = usePollingStatus(
    pollingAtivo && sessao ? sessao.sessao.id : null,
    pollingAtivo ? t : null,
  );

  // Resolve o premio sorteado usando o array `premios` que veio do
  // obter-sessao inicial (mesma viagem que populou o catalogo). Anon
  // nao pode fazer select direto na tabela premios via supabase-js.
  const premioSorteado = React.useMemo(() => {
    if (fase !== 'finalizado' || !payload?.premio_sorteado_id || !sessao) return null;
    const p = sessao.premios.find((x) => x.id === payload.premio_sorteado_id);
    if (!p) return null;
    return {
      nome: p.nome,
      e_premio_real: p.e_premio_real,
      foto_path: p.foto_path ?? null,
    };
  }, [fase, payload, sessao]);

  React.useEffect(() => {
    if (!payload) return;
    if (payload.status === 'finalizada') {
      setFase('finalizado');
    } else if (payload.status === 'expirada' || payload.status === 'cancelada') {
      setErro({
        titulo: 'Sessão encerrada',
        mensagem: 'A jogada foi cancelada. Toque no totem para começar de novo.',
      });
      setFase('erro');
    }
  }, [payload]);

  const onSubmit = React.useCallback(
    async (dados: DadosForm) => {
      if (!s || !t || !fingerprint) return;
      setEnviando(true);
      setNome(dados.nome.split(' ')[0]);
      try {
        await submeterDados(s, t, dados, fingerprint);
        setFase('aguardando');
      } catch (e) {
        const msg = (e as Error).message ?? '';
        if (msg.includes('CONFLICT')) {
          setErro({
            titulo: 'Telefone já participou',
            mensagem:
              'Este telefone já jogou nesta Roleta. Cada celular pode jogar uma vez por evento por jogo.',
          });
        } else if (msg.includes('FORBIDDEN')) {
          setErro({
            titulo: 'Dispositivo bloqueado',
            mensagem: 'Este dispositivo está bloqueado de participar.',
          });
        } else {
          setErro({
            titulo: 'Erro ao enviar',
            mensagem: msg.split('|')[1] ?? 'Tente novamente.',
          });
        }
        setFase('erro');
      } finally {
        setEnviando(false);
      }
    },
    [s, t, fingerprint]
  );

  if (fase === 'erro' && erro) {
    return <ErroSessao titulo={erro.titulo} mensagem={erro.mensagem} />;
  }
  if (fase === 'carregando' || !sessao) {
    return <TelaCarregando />;
  }
  if (fase === 'aguardando') {
    return <AguardandoTotem nome={nome} />;
  }
  if (fase === 'finalizado' && payload?.premio_sorteado_id) {
    if (premioSorteado) {
      return (
        <ResultadoJogador
          premioNome={premioSorteado.nome}
          ePremioReal={premioSorteado.e_premio_real}
          premioFotoPath={premioSorteado.foto_path}
          nome={nome}
        />
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoAltis size={56} />
        <h1 className="text-2xl font-bold tracking-tight">ROLETA DE PRÊMIOS</h1>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados para liberar a roleta no totem.
        </p>
      </div>

      <CatalogoPremios premios={sessao.premios} />

      <FormJogador onSubmit={onSubmit} enviando={enviando} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao participar, você concorda com a Política de Privacidade da Altis.
      </p>
    </main>
  );
}
