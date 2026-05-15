'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Guard global que devolve o usuario a rota original do totem se o
 * modo kiosk estiver armado em sessionStorage. Funciona com URL
 * manual: quando o operador digita outra rota na barra, a pagina
 * recarrega e perde o JS lock, mas a flag `altis_totem_kiosk` e o
 * pathname salvo em `altis_totem_kiosk_path` sobrevivem ao reload
 * (ate a aba ser fechada).
 *
 * O pathname salvo eh ESSENCIAL: sem ele, o guard redirecionava
 * sempre pra /totem (a tela da roleta), o que levava o operador de
 * /totem-dados para /totem-roleta apos qualquer "voltar" — quebra de
 * contexto. Agora respeitamos a rota onde o kiosk foi ativado.
 *
 * A flag e o pathname sao setados/limpos pelo useBloqueioSaidaTotem.
 */

const ROTAS_TOTEM = ['/totem-roleta', '/totem-dados'];
const ROTA_FALLBACK = '/totem-roleta';

export function TotemKioskGuard() {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('altis_totem_kiosk') !== '1') return;
    // Ja estou numa rota de totem — nada a fazer.
    if (pathname && ROTAS_TOTEM.some((r) => pathname.startsWith(r))) return;
    // /jogar e uma URL separada (celular do jogador) — nao bloqueia.
    if (pathname?.startsWith('/jogar')) return;

    // Redireciona pra rota onde o kiosk foi ativado. Se nao houver
    // (storage corrompido ou flag de versao antiga), cai no fallback.
    const rotaOriginal = sessionStorage.getItem('altis_totem_kiosk_path');
    const destino = rotaOriginal && ROTAS_TOTEM.some((r) => rotaOriginal.startsWith(r))
      ? rotaOriginal
      : ROTA_FALLBACK;
    router.replace(destino);
  }, [pathname, router]);

  return null;
}
