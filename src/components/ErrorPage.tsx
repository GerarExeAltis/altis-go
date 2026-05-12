'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, ArrowLeft, RefreshCw, ShieldAlert, FileQuestion, AlertOctagon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ErroVariant = 403 | 404 | 500;

interface Props {
  variant: ErroVariant;
  /** Sobrescreve o titulo default. */
  titulo?: string;
  /** Sobrescreve a descricao default. */
  descricao?: string;
  /** Mostra botao 'Tentar novamente' (default: true apenas no 500) */
  mostrarRecarregar?: boolean;
  /** Callback do botao recarregar (default: window.location.reload). Usado pelo error.tsx do Next. */
  onRecarregar?: () => void;
}

const CONFIG: Record<ErroVariant, {
  titulo: string;
  descricao: string;
  icone: typeof ShieldAlert;
  recarregar: boolean;
}> = {
  403: {
    titulo: 'Acesso negado',
    descricao: 'Voce nao tem permissao para acessar esta area. Verifique se esta no modo admin antes de continuar.',
    icone: ShieldAlert,
    recarregar: false,
  },
  404: {
    titulo: 'Pagina nao encontrada',
    descricao: 'O endereco que voce tentou acessar nao existe ou foi removido.',
    icone: FileQuestion,
    recarregar: false,
  },
  500: {
    titulo: 'Algo deu errado',
    descricao: 'Ocorreu um erro inesperado no servidor. Tente novamente em alguns instantes.',
    icone: AlertOctagon,
    recarregar: true,
  },
};

export function ErrorPage({
  variant,
  titulo,
  descricao,
  mostrarRecarregar,
  onRecarregar,
}: Props) {
  const router = useRouter();
  const cfg = CONFIG[variant];
  const Icone = cfg.icone;
  const recarregarVisivel = mostrarRecarregar ?? cfg.recarregar;

  const fazerRecarregar = () => {
    if (onRecarregar) onRecarregar();
    else if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <main
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-center"
    >
      {/* Numero grande do erro com gif altis ao fundo */}
      <div className="relative flex flex-col items-center">
        <Image
          src="/altis-animacao.gif"
          alt=""
          width={120}
          height={120}
          priority
          unoptimized
          aria-hidden
          className="h-28 w-28 opacity-90"
        />
        <span className="mt-1 text-[64px] font-extrabold leading-none tracking-tighter text-primary/30">
          {variant}
        </span>
      </div>

      {/* Card com mensagem e botoes */}
      <div className="flex max-w-md flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <Icone className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          {titulo ?? cfg.titulo}
        </h1>
        <p className="text-sm text-muted-foreground">
          {descricao ?? cfg.descricao}
        </p>
      </div>

      {/* Acoes */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'gap-2')}
        >
          <Home className="h-4 w-4" />
          Ir para inicio
        </Link>
        {recarregarVisivel && (
          <button
            type="button"
            onClick={fazerRecarregar}
            className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-2')}
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        )}
      </div>
    </main>
  );
}
