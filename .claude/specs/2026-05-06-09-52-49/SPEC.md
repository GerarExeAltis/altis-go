# BUGFIX SPEC — 3 papercuts UX no designer de etiquetas (zoom + resize + tipoImpressao A4)

**Gerado em:** 2026-05-06 09:52:49
**Tipo:** bugfix (3 bugs UX consolidados em um único componente Angular)
**Severidade:** P2
**Ambiente:** desenvolvimento → produção (após deploy)
**Status:** concluído

## Descrição do bug

Três defeitos de UX no designer de etiquetas personalizadas (`cadastro-etiquetas.component.ts`):

1. **Zoom + adicionar componente:** ao adicionar um objeto (texto/barcode/retângulo/linha) com zoom > 100%, o objeto cai no centro do canvas físico — que está fora da área scrollável visível. Usuário precisa fazer scroll manual para encontrá-lo.

2. **Resize + posicionamento:** ao alterar `width`/`height` de um objeto via inputs do form, o objeto não recebe `centerObject`/`setCoords` — fica encostado na coordenada anterior, fora da posição de trabalho.

3. **Tipo A4 + redraw do canvas:** ao mudar `tipoImpressao` para `'A4'`, o handler `sincronizarControlesA4()` aplica `setValue({emitEvent:false})` em larguraCm/alturaCm. O `emitEvent:false` impede que o `valueChanges` dispare `onDimensaoAlterada()` → `atualizarTamanhoCanvas()`. Page só redimensiona quando o usuário aplica zoom.

## Passos para reproduzir

**Bug 1:**
1. Abrir cadastro de etiqueta personalizada.
2. Aplicar zoom 200% via Ctrl+scroll do mouse.
3. Clicar no botão "Adicionar texto" / barcode.
4. **Resultado:** objeto aparece no centro do canvas (off-screen).
5. **Esperado:** objeto aparece centralizado na área visível atual.

**Bug 2:**
1. Adicionar um texto/retângulo no canvas.
2. No painel de propriedades, mudar largura ou altura via input.
3. **Resultado:** objeto fica colado na borda anterior; pode ficar fora do canvas se o crescimento empurrou para fora.
4. **Esperado:** objeto se reposiciona ao centro da viewport visível.

**Bug 3:**
1. Abrir cadastro com tipoImpressao=ZPL e dimensões padrão (10×5 cm).
2. Mudar tipoImpressao para `'A4'`.
3. **Resultado:** larguraCm/alturaCm/etiqPorLinha/dpi recebem 21/29.7/1/96, mas o canvas continua 10×5 cm.
4. **Esperado:** canvas redimensiona automaticamente para 21×29.7 cm.
5. Workaround atual: usuário aplica zoom (Ctrl+scroll ou botão de zoom) → canvas recalcula via `aplicarZoom()`.

## Comportamento esperado

- **Bug 1:** novos objetos centralizam na viewport visível do scroll container, considerando zoom atual.
- **Bug 2:** após `updateObjectWidthCm`/`updateObjectHeightCm`, objeto recentraliza na viewport.
- **Bug 3:** ao mudar tipoImpressao para A4, canvas redimensiona automaticamente (sem precisar de zoom).

## Comportamento atual

- Bug 1: objeto centraliza no canvas inteiro (não na área visível). `centerObject()` do Fabric usa o canvas físico.
- Bug 2: nenhum reposicionamento — objeto cresce/encolhe a partir da coord (`left`,`top`) atual.
- Bug 3: nenhum redraw — canvas mantém dimensões antigas até próximo `aplicarZoom()`.

## Causa raiz

**Arquivo:** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts`

**Bug 1 — linha 762-768 (`adicionarObjetoAoCanvas`):**
```typescript
private adicionarObjetoAoCanvas(obj: fabric.Object): void {
    this.canvas.add(obj);
    this.canvas.centerObject(obj);  // <-- centra no canvas, não na viewport
    obj.setCoords();
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
}
```
O `centerObject` posiciona em `(canvasWidth/2/zoom, canvasHeight/2/zoom)` em coords lógicas. Quando o canvas físico (`setWidth(wPx)` com `wPx = wCm * PIXELS_PER_CM * zoom`) é maior que o scroll container, o "centro" cai numa região não visível.

**Bug 2 — funções `updateObjectWidthCm`/`updateObjectHeightCm` (~linha 938+):**
```typescript
updateObjectWidthCm(valorCm: number): void {
    // ... atualiza obj.width ou scaleX ...
    obj.set('width', novoPx);  // ou similar
    // FALTA: this.canvas.centerObject(obj); obj.setCoords();
    this.canvas.renderAll();
}
```

**Bug 3 — função `sincronizarControlesA4()` (linha 277-294):**
```typescript
if (tipo === 'A4') {
    this.formulario.get('larguraCm')?.setValue(21, { emitEvent: false });
    // ...
    // FALTA: this.atualizarTamanhoCanvas();
}
```
O `emitEvent:false` foi adicionado para evitar cascateamento, mas suprime também o redraw que viria via `valueChanges` → `onDimensaoAlterada()`.

## Camadas afetadas

| Camada | Impacto | Agente |
|---|---|---|
| Angular AltisW (lógica) | Único arquivo: `cadastro-etiquetas.component.ts` (3 fixes) + spec Jest | `altis-angular-agent` |
| Code Review | Sempre | `altis-code-reviewer-agent` |

**NÃO afetados:** Spring Boot, Oracle, Delphi, Python, Mobile.

## Testes TDD planejados

| # | Camada | Cenário | Framework | Status |
|---|---|---|---|---|
| 1 | Angular | Adicionar objeto com zoom=2 (200%) → objeto fica no centro da viewport visível (não no canvas absoluto) | Jest | pendente |
| 2 | Angular | Adicionar objeto com zoom=1 → comportamento atual preservado (regressão) | Jest | pendente |
| 3 | Angular | `updateObjectWidthCm(novoValor)` → `centerObject` chamado + `setCoords()` | Jest | pendente |
| 4 | Angular | `updateObjectHeightCm(novoValor)` → mesma assertiva | Jest | pendente |
| 5 | Angular | Mudar `tipoImpressao` para `'A4'` → canvas dimensions são atualizadas (mock de `atualizarTamanhoCanvas` é chamado) | Jest | pendente |
| 6 | Angular | Mudar de `'A4'` para `'ZPL'` → canvas também redimensiona com defaults | Jest | pendente |

## Riscos de regressão

- **Baixo geral:** mudanças isoladas no componente do designer. Não toca backend, DB, ou outros componentes.
- **Atenção 1:** se o scroll container do canvas tiver outro nome de classe/ref, fix de Bug 1 precisa do seletor correto (provavelmente um `ViewChild` ou `getElementById` já existente — agente verifica).
- **Atenção 2:** sempre recentralizar ao resize (Bug 2) pode "incomodar" usuário que posicionou objeto manualmente e só queria mudar tamanho. Decisão do usuário: **sempre recentralizar** (escolha consciente, simples e previsível).
- **Atenção 3:** chamar `atualizarTamanhoCanvas()` direto no `sincronizarControlesA4()` pode bater com chamadas em cascade do `aplicarZoom()`. Verificar idempotência.

## Decisões tomadas

1. **Centralização:** centro da viewport visível (scroll container `scrollLeft + clientWidth/2`, dividido por zoom para virar coord Fabric).
2. **Bug 2:** sempre recentralizar ao resize (escolha consciente do usuário, sobrepõe-se a posição manual prévia).
3. **Pre-flight dispensado:** P2 UX em UM componente Angular, sem tocar SQL/banco/services compartilhados — escopo cirúrgico justifica o dispensa.
4. **Sem fiscal-agent / integracoes-agent:** sem impacto fiscal nem de integração externa.
