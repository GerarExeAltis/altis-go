'use client';
import * as React from 'react';

/**
 * Bloqueia tentativas de sair da tela do totem enquanto uma sessao
 * esta em andamento. Cobre:
 *
 *  - Botao Voltar do navegador (popstate): a tentativa de voltar e
 *    convertida em abertura do modal de senha, e o history e empurrado
 *    de volta para a URL atual.
 *  - Fechar aba / refresh / digitar URL na barra (beforeunload):
 *    o navegador mostra o confirm nativo "Tem certeza que quer sair?".
 *
 * Retorna `{ modalAberto, abrirModal, fecharModal, liberar }`:
 *  - modalAberto: estado para o componente renderizar <ModalSaidaTotem>
 *  - abrirModal/fecharModal: controle manual (ex: botao "Sair" customizado)
 *  - liberar: chamar apos validar a senha; remove o lock e permite
 *    history.back() ou navegacao programatica subsequente
 */
export function useBloqueioSaidaTotem(ativo: boolean): {
  modalAberto: boolean;
  abrirModal: () => void;
  fecharModal: () => void;
  liberar: (depois?: () => void) => void;
} {
  const [modalAberto, setModalAberto] = React.useState(false);
  const liberadoRef = React.useRef(false);

  React.useEffect(() => {
    if (!ativo) {
      liberadoRef.current = false;
      sessionStorage.removeItem('altis_totem_kiosk');
      return;
    }

    // Marca em sessionStorage que o totem esta em modo kiosk. Lido pelo
    // TotemKioskGuard montado no layout raiz: se o usuario tentar trocar
    // a URL na barra (ex: localhost:3000/login) o reload da pagina perde
    // o JS lock, mas o guard ve a flag e redireciona de volta para /totem.
    sessionStorage.setItem('altis_totem_kiosk', '1');

    // Empurra uma entrada "amortecedora" no history. Quando o user
    // clica Voltar, esse pop nos coloca de volta na mesma URL — sem
    // o efeito visual de "sair pra outra pagina".
    window.history.pushState({ totemLock: true }, '', window.location.href);

    const onPopState = () => {
      if (liberadoRef.current) return; // ja liberado, deixa sair
      // Re-empurra a URL atual para nao perder o lock
      window.history.pushState({ totemLock: true }, '', window.location.href);
      setModalAberto(true);
    };

    // NAO usamos beforeunload: ele dispara o confirm nativo do navegador
    // ("Sair da pagina / Permanecer na pagina"), que e feio e nao pode
    // ser substituido por um toast customizado (limitacao de seguranca).
    // A saida via URL manual / reload e tratada pelo TotemKioskGuard no
    // layout raiz, que le sessionStorage no carregamento da nova rota e
    // redireciona de volta para /totem com um toast informativo.

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [ativo]);

  const abrirModal = React.useCallback(() => setModalAberto(true), []);
  const fecharModal = React.useCallback(() => setModalAberto(false), []);
  const liberar = React.useCallback((depois?: () => void) => {
    liberadoRef.current = true;
    sessionStorage.removeItem('altis_totem_kiosk');
    setModalAberto(false);
    // Da um ciclo para o ref refletir antes de tentar navegar
    queueMicrotask(() => depois?.());
  }, []);

  return { modalAberto, abrirModal, fecharModal, liberar };
}
