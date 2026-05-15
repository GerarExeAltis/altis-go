import { AuthGuard } from '@/components/auth/AuthGuard';
import { TotemProvider } from '@/contexts/TotemContext';

/**
 * Layout compartilhado entre os dois jogos do totem (roleta e dados).
 * Substitui a duplicacao anterior (/totem-roleta/layout + /totem-dados/
 * layout), que tinha exatamente o mesmo conteudo. Aqui o segmento
 * [jogo] da URL distingue o jogo, repassado para o TotemProvider.
 *
 * Static export: generateStaticParams + dynamicParams=false fazem o
 * Next pre-gerar APENAS as duas rotas validas (/totem/roleta,
 * /totem/dados) — nenhuma outra string em [jogo] funciona em build
 * estatico.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ jogo: 'roleta' }, { jogo: 'dados' }];
}

export default async function TotemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ jogo: 'roleta' | 'dados' }>;
}) {
  const { jogo } = await params;
  return (
    <AuthGuard>
      <TotemProvider tipoJogo={jogo} baseRoute={`/totem/${jogo}`}>
        {children}
      </TotemProvider>
    </AuthGuard>
  );
}
