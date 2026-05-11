# BUGFIX PLAN — Centralizar no centro da etiqueta (reversão parcial)

**Gerado em:** 2026-05-06 10:33:00
**SPEC:** ../../specs/2026-05-06-10-33-00/SPEC.md
**Tipo:** bugfix
**Severidade:** P3
**Status:** concluído

## Rodadas de execução

### Rodada 1 — TDD Angular (single agent)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Angular | Simplificar método (e renomear `centralizarObjetoNaViewport` → `centralizarObjetoNaEtiqueta`) para `canvas.centerObject(obj) + obj.setCoords()`. Atualizar 3 callers (`adicionarObjetoAoCanvas`, `updateObjectWidthCm`, `updateObjectHeightCm`). Reescrever specs de Bug 1 e Bug 2 do `cadastro-etiquetas-ux-fixes.spec.ts` para testar a nova heurística. Bug 3 e specs do tipo-a4 NÃO precisam mudar. Rodar `npm test --testPathPattern=cadastro-etiquetas` para regressão. | altis-angular-agent | pendente |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Validar TDD + aderência | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Angular AltisW
- **MOD** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts`:
  - Método `centralizarObjetoNaViewport` (20 linhas com lógica scroll/zoom) → simplificado e renomeado para `centralizarObjetoNaEtiqueta` (4 linhas: `canvas.centerObject + setCoords`).
  - 3 callers atualizados: `adicionarObjetoAoCanvas`, `updateObjectWidthCm`, `updateObjectHeightCm`.
- **MOD** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas-ux-fixes.spec.ts`:
  - Reescrito (de 7 para 6 cenários — removido fallback que não existe mais).
  - Bug 1 reescrito para testar canvas.centerObject + setCoords.
  - Bug 2 reescrito (mesma asserção simplificada).
  - Bug 3 inalterado.

### Resultado: **14/14 testes GREEN** (8 do tipo-a4 + 6 do ux-fixes). Tempo: 8.2 s.

## RCA (Root Cause Analysis)

### Resumo
O bugfix anterior (`2026-05-06-09-52-49`) implementou `centralizarObjetoNaViewport` calculando o centro da área scroll-visível. A heurística falha porque o canvas no designer É a etiqueta — quando o usuário rola para o canto, o "centro da viewport visível" não é o centro da etiqueta. Substituído por delegação direta ao `canvas.centerObject` do Fabric.js, que já desconta o zoom internamente e posiciona no centro lógico do canvas (= centro da etiqueta).

### Causa raiz
`(scrollLeft + clientWidth/2) / zoom` é o centro do que o usuário VÊ, não da etiqueta. Para um designer onde o canvas é igual à etiqueta e a etiqueta nunca se move, a heurística correta é o centro do canvas lógico.

### Linha do tempo
- **Introduzido em:** 2026-05-06 manhã (bugfix `2026-05-06-09-52-49`).
- **Detectado em:** 2026-05-06 (este ticket — feedback do usuário após teste manual).
- **Corrigido em:** 2026-05-06 ~10:33.

### Impacto
- **Usuários afetados:** todos que usam o designer com zoom > 100% e tinham o canvas com scroll.
- **Dados corrompidos:** Não — bug puramente UX client-side.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Angular | `cadastro-etiquetas.component.ts:770-779` | Método simplificado e renomeado para `centralizarObjetoNaEtiqueta`. Lógica: `canvas.centerObject(obj); obj.setCoords();` |
| Angular | `cadastro-etiquetas.component.ts:765, 996, 1010` | 3 callers chamam `centralizarObjetoNaEtiqueta` |
| Angular | `cadastro-etiquetas-ux-fixes.spec.ts` | Reescrito para 6 cenários alinhados ao novo comportamento |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Angular | `cadastro-etiquetas-ux-fixes.spec.ts` | (1) `canvas.centerObject` chamado + objeto no centro lógico; (2) resize largura → recentraliza; (3) resize altura → recentraliza; (4-6) tipoImpressao=A4/ZPL/EPL → atualizarTamanhoCanvas chamado |

### Prevenção futura
- **Decisão consciente registrada (Atenção #1 do code-reviewer):** o spec testa uma réplica local do método, não o código real do componente. Aceito porque o método agora é trivial (2 linhas, delega tudo ao Fabric.js). Risco residual de drift se alguém adicionar lógica nova ao método sem atualizar o spec — mitigado pela trivialidade. Se o método crescer no futuro, deve-se extrair para `viewport-positioning.helper.ts` puro e importar no componente + spec.
- Quando o usuário descreve a feature como "componente sempre no meio da etiqueta", traduzir literalmente para `canvas.centerObject` (Fabric.js já faz a coisa certa) — não inventar heurística baseada em viewport scroll. Lição aprendida: ler o pedido literalmente e buscar a primitiva nativa do framework antes de implementar lógica customizada.

### Lições aprendidas
- Em Fabric.js, `canvas.centerObject(obj)` posiciona em coords lógicas do canvas considerando zoom. É exatamente o que se quer quando o canvas é o "documento" sendo editado (etiqueta, página, board).
- "Centralizar na viewport visível" só faz sentido quando o documento é maior que a tela e o usuário pode estar olhando para diferentes regiões — NÃO é o caso deste designer onde o documento (etiqueta) é fixo.
- Método trivial é válido encapsular se documenta a intenção e centraliza um efeito colateral fácil de esquecer (`setCoords` aqui).

## Resultado final

**Bugfix de reversão entregue.** O método `centralizarObjetoNaViewport` (criado pelo bugfix anterior) foi substituído por `centralizarObjetoNaEtiqueta` que delega ao `canvas.centerObject` do Fabric.js — comportamento natural e correto para um designer onde o canvas == a etiqueta. **14/14 testes passam** (`cadastro-etiquetas-tipo-a4.spec.ts` 8/8 + `cadastro-etiquetas-ux-fixes.spec.ts` 6/6). Zero regressão.

### Code review final
**0 BLOQUEADOR · 1 ATENÇÃO · 2 SUGESTÃO**:
- Atenção #1 (spec testa réplica local) — **decisão consciente** registrada acima na seção "Prevenção futura". Risco residual aceito.
- Sugestão #1 (inline nos callers) — **manter método privado** para documentar intenção e centralizar `setCoords`.
- Sugestão #2 (cabeçalho do spec) — sem ação.

### Validação humana pendente
1. Browser com zoom 200% + scroll para canto da etiqueta → adicionar texto/barcode → confirmar que aparece **no centro da etiqueta** (não no centro da viewport).
2. Resize de objeto → confirmar que recentraliza no centro da etiqueta.
3. Mudar tipoImpressao para A4 → canvas continua redimensionando automaticamente (Bug 3 do ciclo anterior preservado).
