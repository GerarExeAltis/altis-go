# BUGFIX SPEC — Centralizar componente no centro da etiqueta (não na viewport scroll)

**Gerado em:** 2026-05-06 10:33:00
**Tipo:** bugfix (reversão parcial da heurística do bugfix anterior)
**Severidade:** P3 (UX papercut)
**Ambiente:** desenvolvimento → produção
**Status:** concluído

## Descrição do bug
O bugfix anterior (`2026-05-06-09-52-49`) implementou `centralizarObjetoNaViewport` calculando `(scrollLeft + clientWidth/2) / zoom`. A heurística está incorreta para este designer: o canvas Fabric.js **É** a etiqueta (físico = `wCm * PIXELS_PER_CM * zoom`), e a etiqueta nunca se move. Quando o usuário rola para olhar um canto da etiqueta com zoom > 100%, o "centro da viewport scroll-visível" cai num ponto offset da etiqueta — não no centro dela. Resultado: componente novo aparece longe do meio da etiqueta.

## Passos para reproduzir
1. Abrir cadastro de etiqueta personalizada (10×5 cm, ZPL).
2. Aplicar zoom 200% via Ctrl+scroll.
3. Rolar o canvas para o canto inferior direito (scroll horizontal e vertical aplicado).
4. Clicar em "Adicionar texto".
5. **Resultado:** texto aparece no centro da viewport visível atual (canto inferior direito da etiqueta).
6. **Esperado:** texto aparece no centro da etiqueta (no meio do canvas lógico).

## Comportamento esperado
- Componente novo (texto, barcode, retângulo, linha) sempre cai no centro da etiqueta — independentemente do scroll do usuário e do nível de zoom.
- Resize de objeto recentraliza no centro da etiqueta.
- Demais comportamentos (Bug 3 — `sincronizarControlesA4` dispara `atualizarTamanhoCanvas`) preservados.

## Comportamento atual
`centralizarObjetoNaViewport` usa `wrapper.scrollLeft/clientWidth/scrollTop/clientHeight / currentZoom`. Quando `scrollLeft > 0` (usuário rolou), o "centro" calculado é deslocado.

## Causa raiz
**Arquivo:** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts:773-789`

Heurística atual:
```typescript
const visibleCenterX = (wrapper.scrollLeft + wrapper.clientWidth  / 2) / this.currentZoom;
const visibleCenterY = (wrapper.scrollTop  + wrapper.clientHeight / 2) / this.currentZoom;
obj.set({
    left: visibleCenterX - (obj.getScaledWidth()  / 2),
    top:  visibleCenterY - (obj.getScaledHeight() / 2),
});
```

Esta fórmula é correta para "centralizar no que o usuário está vendo agora", mas o caso real é "centralizar na etiqueta" — `canvas.centerObject(obj)` do Fabric.js já faz isso considerando o zoom internamente.

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Angular AltisW | Simplificar `centralizarObjetoNaViewport` (renomear → `centralizarObjetoNaEtiqueta`) e ajustar spec | `altis-angular-agent` |
| Code Review | Sempre | `altis-code-reviewer-agent` |

**NÃO afetados:** Backend, DB, Delphi.

## Testes TDD planejados
| # | Camada | Cenário | Framework | Status |
|---|---|---|---|---|
| 1 | Angular | Adicionar objeto com canvas lógico 400×300, zoom irrelevante → objeto fica no centro lógico (200, 150) menos metade do tamanho | Jest | pendente |
| 2 | Angular | Resize largura → recentraliza no centro do canvas lógico | Jest | pendente |
| 3 | Angular | Resize altura → idem | Jest | pendente |
| 4 | Angular | tipoImpressao=A4 → atualizarTamanhoCanvas chamado (preservar) | Jest | pendente |
| 5 | Angular | tipoImpressao=ZPL → atualizarTamanhoCanvas chamado (preservar) | Jest | pendente |
| 6 | Angular | tipoImpressao=EPL → idem (preservar) | Jest | pendente |

## Riscos de regressão
- **Baixíssimo:** simplificação de algoritmo. Volta ao comportamento "natural" do Fabric.js. Bug 2 e Bug 3 do bugfix anterior continuam corrigidos.
- **Atenção:** o spec novo do bugfix anterior testa réplica local do método antigo — vai precisar ser atualizado para refletir a nova fórmula simples.

## Decisões tomadas
1. **Estratégia:** sempre centralizar no centro da etiqueta (canvas lógico), via `canvas.centerObject(obj) + obj.setCoords()`.
2. **Nome do método:** renomear `centralizarObjetoNaViewport` → `centralizarObjetoNaEtiqueta` (semântica mais clara).
3. **Pre-flight dispensado:** P3 cosmético/UX, em UM componente Angular, sem tocar SQL/banco/services compartilhados.
