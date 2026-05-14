'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Guard global que devolve o usuario a /totem se o modo kiosk estiver
 * armado em sessionStorage. Funciona com URL manual: quando o operador
 * digita outra rota na barra, a pagina recarrega e perde o JS lock,
 * mas a flag `altis_totem_kiosk` em sessionStorage sobrevive ao reload
 * (ate a aba ser fechada) — esse hook redireciona de volta a /totem.
 *
 * A flag e setada/limpa pelo useBloqueioSaidaTotem.
 */
export function TotemKioskGuard() {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('altis_totem_kiosk') !== '1') return;
    if (pathname?.startsWith('/totem')) return;
    // /jogar e uma URL separada (celular do jogador) — nao bloqueia.
    if (pathname?.startsWith('/jogar')) return;

    router.replace('/totem');
  }, [pathname, router]);

  return null;
}
