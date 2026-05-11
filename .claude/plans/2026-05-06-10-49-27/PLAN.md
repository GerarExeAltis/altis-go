# BUGFIX PLAN — Persistir largura/altura ao carregar etiqueta existente

**Gerado em:** 2026-05-06 10:49:27
**SPEC:** ../../specs/2026-05-06-10-49-27/SPEC.md
**Tipo:** bugfix
**Severidade:** P1
**Status:** concluído

## Rodadas de execução

### Rodada 1 — TDD Angular
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Angular | Rastrear `previousTipoImpressao` (campo private). Reset de defaults no else SÓ quando `previousTipoImpressao === 'A4' && tipo !== 'A4'`. Atualizar `sincronizarControlesA4()` para receber `tipo` atual e comparar. Atualizar spec `cadastro-etiquetas-ux-fixes.spec.ts` (cenários Bug 3) para cobrir os 5 cenários novos (carregar ZPL→preservar; A4→ZPL transição→reset; ZPL→ZPL idempotente; EPL→A4 transição A4 OK; A4→A4 idempotente). | altis-angular-agent | pendente |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Validar TDD + aderência | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Angular AltisW
- **MOD** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts`:
  - +1 campo private `previousTipoImpressao: string | null = null;` (após `private currentZoom`).
  - Método `sincronizarControlesA4()`: detecta `transicaoSaindoDeA4 = previousTipoImpressao === 'A4' && tipo !== 'A4'`. Reset de defaults condicionado a essa transição. Atualiza `this.previousTipoImpressao = tipo` ao final.
- **MOD** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas-ux-fixes.spec.ts`:
  - Refatorada réplica local: `sincronizarControlesA4ComRedraw` (pura) → `criarSincronizador()` (factory com closure isolando `previousTipoImpressao` por teste).
  - Reescrito `describe "Bug 3"` com 6 cenários: carregar ZPL preserva, A4→ZPL reseta, ZPL→ZPL idempotente, ZPL→EPL preserva, ZPL→A4 aplica defaults A4 + disable, atualizarTamanhoCanvas chamado em todos.

### Resultado: **17/17 testes GREEN** (8 do `cadastro-etiquetas-tipo-a4.spec.ts` + 9 do `cadastro-etiquetas-ux-fixes.spec.ts`). Tempo: 7.3 s. Zero regressão.

## RCA (Root Cause Analysis)

### Resumo
Regressão direta do bugfix `2026-05-05-15-15-54`: o else branch de `sincronizarControlesA4()` resetava `larguraCm/alturaCm/etiquetasPorLinha/resolucaoDpi` para defaults sempre que `tipoImpressao !== 'A4'`. Como o método é chamado em `montarDado()` ao carregar etiqueta existente, sobrescrevia os valores recém-carregados do backend — toda etiqueta ZPL/EPL existente perdia as dimensões salvas.

### Causa raiz
O reset incondicional no else branch foi a forma mais simples de implementar a feature original "ao mudar A4→ZPL, restaurar defaults", mas não distinguia o cenário de **transição manual** do cenário de **inicialização/carregamento**. Faltou rastrear o estado anterior para detectar transição.

### Linha do tempo
- **Introduzido em:** 2026-05-05 (bugfix `2026-05-05-15-15-54` — "ao mudar A4→ZPL zerar valores").
- **Detectado em:** 2026-05-06 (este ticket — usuário relatou ao tentar editar etiqueta existente).
- **Corrigido em:** 2026-05-06 ~10:49.

### Impacto
- **Usuários afetados:** todos que editaram etiquetas ZPL/EPL existentes com dimensões diferentes dos defaults (10×5 cm) entre 2026-05-05 e 2026-05-06.
- **Dados corrompidos:** Não — os valores no banco permaneceram intactos. O bug ocorria apenas no preenchimento do form ao carregar; se o usuário **salvasse** sem perceber e o form enviasse os defaults, aí sim haveria sobrescrita no banco. Verificar se algum cliente em homologação/produção salvou etiqueta sobrescrita.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Angular | `cadastro-etiquetas.component.ts:202` | Adicionado campo `private previousTipoImpressao: string \| null = null;` |
| Angular | `cadastro-etiquetas.component.ts:277-307` | Método detecta transição A4→não-A4. Reset condicionado. Atualiza tracking ao final. |
| Angular | `cadastro-etiquetas-ux-fixes.spec.ts` | Refatorado para `criarSincronizador()` factory + 6 cenários novos no Bug 3 |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Angular | `cadastro-etiquetas-ux-fixes.spec.ts` | (1) carregar ZPL preserva; (2) A4→ZPL reseta; (3) ZPL→ZPL idempotente; (4) ZPL→EPL preserva; (5) ZPL→A4 aplica defaults A4 + disable; (6) atualizarTamanhoCanvas em todos |

### Prevenção futura
- **Regra para futuros handlers de `valueChanges`:** quando o handler é chamado em múltiplos contextos (init, carregamento, mudança manual), distinguir explicitamente o contexto antes de aplicar efeitos colaterais (ex: rastreando estado anterior, ou recebendo flag/parâmetro indicando origem da chamada).
- **Cobertura:** o spec original do bugfix `2026-05-05-15-15-54` cobria APENAS o ramo de transição manual (mudar tipoImpressao no form), não cobria carregamento de dados — dívida de cobertura. Spec novo agora cobre os dois fluxos.

### Lições aprendidas
- Reactive Forms emitem `valueChanges` mesmo quando o valor setado é igual ao atual (a menos que use `setValue(value, { emitEvent: false })`). Combinado com chamadas múltiplas do mesmo handler em fluxos diferentes (init/carregamento/manual), isso é fonte comum de regressão silenciosa.
- TDD com cenários de **carregamento de dados existentes** (não apenas form vazio) é essencial para handlers que podem ser invocados via `montarDado` / `patchValue`.
- Idempotência ≠ correção: o método antigo era idempotente (chamar 2x ZPL produz mesmo resultado), mas o resultado era errado para o caso de carregamento. "Idempotente" só significa "estável", não "correto".

## Resultado final

**Bugfix entregue.** Adicionado tracking `previousTipoImpressao` que distingue transição manual A4→não-A4 (intencional → reset) de carregamento/idempotência (não-intencional → preserva). Feature original do bugfix `2026-05-05-15-15-54` (reset on A4→ZPL) preservada. **17/17 testes GREEN.** Zero regressão.

### Code review final
**0 BLOQUEADOR · 0 ATENÇÃO · 3 SUGESTÃO** (todas opcionais e cosméticas — magic string `'A4'`, helper para reset, spec-réplica trade-off já aceito).

### Validação humana pendente
1. Browser: cadastrar etiqueta ZPL com larguraCm=15, alturaCm=8 → salvar → reabrir → confirmar que **valores 15×8 são exibidos** (não 10×5 dos defaults).
2. Browser: criar nova etiqueta → mudar tipoImpressao para A4 → mudar para ZPL → confirmar que **defaults 10×5/203/1 são restaurados** (preservando o feature original).
3. Browser: editar etiqueta A4 existente → confirmar que aparece com 21×29.7/96/1 + inputs disabled.

### Tickets de follow-up sugeridos
- **Cobertura de regressão de carregamento:** revisitar outros handlers de `valueChanges` no AltisW que possam ter o mesmo padrão (efeito colateral em mudança que dispara em init/carregamento). Skill ou code-reviewer pode adicionar essa heurística.
- **Auditoria de dados:** se algum cliente em produção/homologação salvou etiqueta com defaults sobrescritos entre 2026-05-05 e 2026-05-06, considerar query de inspeção `SELECT * FROM ETIQUETAS_PERSONALIZADAS WHERE LARGURA_CM = 10 AND ALTURA_CM = 5 AND DATA_HORA_ALTERACAO BETWEEN ...` para identificar candidatos a revisão manual.
