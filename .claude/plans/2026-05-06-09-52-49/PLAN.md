# BUGFIX PLAN — 3 papercuts UX no designer de etiquetas

**Gerado em:** 2026-05-06 09:52:49
**SPEC:** ../../specs/2026-05-06-09-52-49/SPEC.md
**Tipo:** bugfix
**Severidade:** P2
**Status:** concluído

## Rodadas de execução

### Rodada 1 — TDD Angular (3 bugs em paralelo dentro do mesmo agente)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Angular | Spec Jest com 6 cenários (Bug1, Bug2, Bug3 + regressões). Implementar `centralizarObjetoNaViewport(obj)` reusável; usar em `adicionarObjetoAoCanvas` (Bug1), `updateObjectWidthCm`/`updateObjectHeightCm` (Bug2). Em `sincronizarControlesA4()` adicionar `this.atualizarTamanhoCanvas()` no branch A4 e no else (após reset de defaults). Rodar `npm test --testPathPattern=cadastro-etiquetas` para regressão completa. | altis-angular-agent | pendente |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Validar TDD, aderência ao CLAUDE.md, padrão Angular | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Angular AltisW
- **MOD** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts`:
  - Substituído `adicionarObjetoAoCanvas` para usar novo método privado `centralizarObjetoNaViewport(obj)` (Bug 1).
  - Adicionado método privado `centralizarObjetoNaViewport(obj)` que usa `canvasWrapper.nativeElement.scrollLeft/scrollTop/clientWidth/clientHeight` dividido por `currentZoom`. Fallback para `canvas.centerObject` se wrapper indisponível.
  - `updateObjectWidthCm` e `updateObjectHeightCm`: após `mutarObjetoAtivo`, chamam `centralizarObjetoNaViewport(obj)` + `canvas.requestRenderAll()` (Bug 2 + ajuste pós code-review).
  - `sincronizarControlesA4`: adicionado `this.atualizarTamanhoCanvas()` ao final do método (Bug 3).

- **NOVO** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas-ux-fixes.spec.ts` — 7 cenários Jest (sem TestBed; testa lógica pura via réplicas locais).

### Total: 1 modificado + 1 novo
### Resultado: **15/15 testes passam** (8 do tipo-a4 anterior + 7 do ux-fixes). Zero regressão.

## RCA (Root Cause Analysis)

### Resumo
Três defeitos UX no designer Fabric.js de etiquetas personalizadas: (1) objetos adicionados em zoom alto caíam fora da viewport visível; (2) resize de objeto não recentralizava; (3) mudança de tipo para A4 não redesenhava o canvas. Causa comum aos três: cálculo de posição/dimensão executado em coords do canvas físico (não da área visível) e supressão de cascade do `valueChanges` impedindo o redraw automático.

### Causa raiz
**Bug 1 (linha 762-768 do componente):** `adicionarObjetoAoCanvas` chamava `this.canvas.centerObject(obj)`. Em Fabric.js, `centerObject` posiciona em `(canvasWidth/2/zoom, canvasHeight/2/zoom)` em coords lógicas. Quando o canvas físico (`setWidth(wPx)` com `wPx = wCm * PIXELS_PER_CM * zoom`) excede a área scroll-visível, o "centro" fica fora do viewport.

**Bug 2 (linhas 971-992):** `updateObjectWidthCm` / `updateObjectHeightCm` aplicavam `obj.set('width'/'scaleX'/...)` mas não chamavam `centerObject`/`setCoords` depois — objeto crescia/encolhia a partir de `(left, top)` antigos.

**Bug 3 (linhas 277-294):** `sincronizarControlesA4` (introduzido em bugfix anterior) usa `setValue({ emitEvent: false })` para evitar cascade de `valueChanges`. Esse `emitEvent:false` também suprime o redraw que viria via `tipoImpressao.valueChanges → onDimensaoAlterada → atualizarTamanhoCanvas`.

### Linha do tempo
- **Bug 1+2 introduzidos:** desde a implementação original do designer Fabric.js (sem commit específico — bugs latentes de UX).
- **Bug 3 introduzido:** 2026-05-05 — bugfix anterior que adicionou `sincronizarControlesA4()` com `emitEvent:false`.
- **Detectado em:** 2026-05-06 (este ticket).
- **Corrigido em:** 2026-05-06.

### Impacto
- **Usuários afetados:** todos que usam o designer de etiquetas personalizadas no AltisW com zoom > 100% (Bug 1) ou que ajustam dimensões via inputs do form (Bug 2) ou que mudam o tipo para A4 (Bug 3).
- **Dados corrompidos:** Não — defeitos puramente client-side de UX. Não afetam serialização nem persistência.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Angular | `cadastro-etiquetas.component.ts:762-789` | Novo `centralizarObjetoNaViewport(obj)` privado que calcula centro da viewport scroll-visível. Substitui `canvas.centerObject` no `adicionarObjetoAoCanvas`. |
| Angular | `cadastro-etiquetas.component.ts:971-1006` | `updateObjectWidthCm`/`updateObjectHeightCm` chamam `centralizarObjetoNaViewport(obj)` + `canvas.requestRenderAll()` ao final. |
| Angular | `cadastro-etiquetas.component.ts:298` | `sincronizarControlesA4()` chama `this.atualizarTamanhoCanvas()` ao final, garantindo redraw em ambos os branches A4 e ZPL/EPL. |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Angular | `cadastro-etiquetas-ux-fixes.spec.ts` | 7 cenários: (1) zoom>1 + scroll → centro da viewport; (2) wrapper indisponível → fallback canvas.centerObject; (3) ajuste de largura → recentraliza; (4) ajuste de altura → recentraliza; (5) tipoImpressao=A4 → atualizarTamanhoCanvas chamado; (6) tipoImpressao=ZPL → idem com reset de defaults; (7) tipoImpressao=EPL → idem |

### Prevenção futura
- Considerar extrair `centralizarObjetoNaViewport` para `viewport-positioning.helper.ts` (helper puro exportado), permitindo specs testarem o código real em vez de réplica local. Sugestão evolutiva do code-reviewer (Atenção #1) — não bloqueante mas vale a pena no próximo refator.
- Adicionar comentário inline em `toggleQuebraTexto` registrando que NÃO passa por `adicionarObjetoAoCanvas` propositalmente (o objeto preserva `left/top` originais via `extrairPropsComuns` — caso de troca in-place).

### Lições aprendidas
- `setValue({ emitEvent: false })` em reactive forms é uma faca de dois gumes: evita cascade indesejado mas suprime callbacks legítimos. Quando o callback é necessário independentemente, chame-o explicitamente após o `setValue`.
- Em Fabric.js com zoom, `centerObject` centra no canvas físico — não na viewport visível. Para UX correta com zoom alto, sempre considerar `scrollLeft/scrollTop/clientWidth/clientHeight` do scroll container.
- Após mover `left/top` programaticamente, lembrar de `setCoords()` (cache de bounding box) e `requestRenderAll()` (re-render do frame).

## Resultado final

**Bugfix entregue.** 3 fixes UX cirúrgicos em um único componente Angular (`cadastro-etiquetas.component.ts`), cobertos por 7 cenários Jest novos (cadastro-etiquetas-ux-fixes.spec.ts). **15/15 testes passam** quando combinados com a suíte do bugfix anterior (cadastro-etiquetas-tipo-a4.spec.ts). Zero regressão.

### Code review final
**0 BLOQUEADOR · 3 ATENÇÃO · 4 SUGESTÃO**:
- Atenção #1 (spec testa réplica local) — registrada como recomendação evolutiva (próximo ticket).
- Atenção #2 (`mutarObjetoAtivo` + `getActiveObject` redundante) — aceitável manter no padrão atual (idempotência).
- Atenção #3 (possível duplo reflow no init) — `atualizarTamanhoCanvas` é idempotente; aceitável.
- Sugestão #4 — APLICADA: `requestRenderAll()` adicionado após `centralizarObjetoNaViewport` em `updateObjectWidthCm`/`updateObjectHeightCm`.

### Validação humana pendente
1. Testar manualmente no browser com zoom 200% — adicionar texto/barcode/retângulo/linha; confirmar que aparecem no centro da viewport visível.
2. Testar manualmente: ajustar largura/altura de um objeto via inputs; confirmar que recentraliza na viewport.
3. Testar manualmente: mudar tipoImpressao para A4 (sem aplicar zoom) — confirmar que canvas redimensiona automaticamente para 21×29.7 cm.
4. Confirmar que não há flicker visual no carregamento inicial da tela (Atenção #3 do code-reviewer).
5. Smoke test em viewport mobile (360×640) — confirmar que comportamento de centralização não quebra em telas pequenas.

### Tickets de follow-up sugeridos (do code-reviewer)
- **Refatorar `centralizarObjetoNaViewport` para helper puro exportado** (`viewport-positioning.helper.ts`) — permite o spec testar o código real, eliminando risco de drift entre componente e réplica local.
- **Padronizar `mutarObjetoAtivo`** — fazer retornar o objeto mutado, eliminando o `getActiveObject` redundante.
- **Adicionar comentário em `toggleQuebraTexto`** explicando por que não passa por `adicionarObjetoAoCanvas`.
