# BUGFIX PLAN — Código de barras comprimido em etiquetas personalizadas (EPL)

**Gerado em:** 2026-05-05 12:21:20
**SPEC:** ../../specs/2026-05-05-12-21-20/SPEC.md
**Tipo:** bugfix
**Severidade:** P2
**Status:** concluído

## Rodadas de execução

### Rodada 0 — Pre-flight
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 0 | Cross | Mapear arquivos sensíveis, blast radius, CLAUDE.md relevantes | altis-impact-analyzer-agent | em andamento |

### Rodada 1 — TDD por camada (paralela)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Spring Boot | Red→Green→Refactor: corrigir `EplConverterService.emitirBarcode()` para calcular `narrow`/`wide` proporcionais a `wPx` | altis-spring-agent | em andamento |
| 2 | Delphi | Verificar chamadores reais de `TEtiquetaPersonalizada.AddBarEpl`; se ativo, espelhar lógica e cobrir com DUnitX. Se morto, documentar | altis-delphi-agent | em andamento |
| 3 | Angular | Spec Jasmine validando contrato do payload (campo `width` do barcode chega ao backend) | altis-angular-agent | em andamento |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 4 | Cross | Revisão final: aderência CLAUDE.md, ausência de credenciais, qualidade do TDD, cobertura | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Spring Boot
- **NOVO:** `Orientado a Objetos\SpringBoot\AltisClienteWs\src\test\java\com\altissistemas\clientews\api\helpers\EplConverterServiceTest.java` (8 testes JUnit 5, ~6.500 bytes — criado via `Bash cat` pelo altis-spring-agent)
- **EDITADO:** `Orientado a Objetos\SpringBoot\AltisClienteWs\src\main\java\com\altissistemas\clientews\api\helpers\EplConverterService.java` (linhas 309-351 — método `emitirBarcode` recalculado + novo helper `modulosBarcode` espelhando `ZplConverterService`)

### Angular
- **NOVO:** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas-payload.spec.ts` (15 specs Jest — Suite 1: serialização do canvas; Suite 2: contrato HTTP `gerarPreview`. **Resultado: 15/15 GREEN em 4.7 s**)

### Delphi
- *Nenhum arquivo modificado.* `TEtiquetaPersonalizada.AddBarEpl` confirmado código morto (sem chamadores em todo o monorepo). Recomendado ticket futuro de limpeza.

### Não tocados pelo bugfix (já modificados na branch antes do start)
> Os arquivos abaixo aparecem no `git status` mas pertencem ao trabalho de migração CSS → primitivos UI (Cenário B) que estava em andamento ANTES deste bugfix. **Não fazem parte deste fix** e devem ser commitados separadamente:
> - `Orientado a Objetos\Angular\AltisW\package-lock.json`
> - `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts` (imports/registro de `InputSelectComponent`)
> - `Orientado a Objetos\Angular\AltisW\src\app\shared\components\input-group-check-box\input-group-check-box.component.ts`
> - `Orientado a Objetos\Angular\AltisW\src\app\shared\components\input-valor\input-valor.component.ts`

## RCA (Root Cause Analysis)

### Resumo
`EplConverterService.emitirBarcode()` ignorava a largura visual `wPx` do retângulo do barcode definido no editor Fabric.js do AltisW e usava sempre `narrow=2` / `wide=5` hardcoded, fazendo o barcode imprimir comprimido em qualquer impressora EPL.

### Causa raiz
No backend Spring Boot AltisClienteWs, o helper `EplConverterService` é responsável por traduzir o JSON de layout vindo do Angular para o stream EPL enviado pelo Delphi à impressora. A função `emitirBarcode(JsonNode obj, int left, int top, double wPx, double hPx)` recebia corretamente `wPx` (largura em px do retângulo desenhado pelo usuário), mas as variáveis `narrow` e `wide` (largura em dots dos módulos do barcode) eram inicializadas com constantes literais `2` e `5`, envoltas em `Math.max/Math.min` que apenas validavam range mas não usavam `wPx`. A altura usava `hPx` corretamente, por isso o sintoma era apenas largura comprimida.

O irmão `ZplConverterService.emitirBarcode()` (linhas 290-297) já fazia o cálculo correto: convertia `wPx` em dots, dividia pelo total de módulos do barcode (helper `modulosBarcode(tipo, len)`), aplicava clamp `[2,10]` e gerava `^BY<mw>,3,<altura>`. O EPL nunca recebeu a mesma lógica.

### Linha do tempo
- **Introduzido em:** desde a implementação original do `EplConverterService` (não há commit de regressão — bug existia desde a primeira versão; o ZPL nasceu correto e o EPL nasceu errado).
- **Detectado em:** 2026-05-05 — usuário relatou em produção via `/altis-bugfix`.
- **Corrigido em:** 2026-05-05 12:21 a ~14:00 (TDD em paralelo com 4 agentes especializados).

### Impacto
- **Usuários afetados:** todas as empresas que usam etiquetas personalizadas com impressão EPL e barcode (Code 128 ou Interleaved 2 of 5). EAN-13 já cai em Code 128 por bloqueio de `tipoBarcode`.
- **Dados corrompidos:** Não — o bug é puramente visual no stream EPL gerado dinamicamente. Etiquetas já impressas continuam ilegíveis e precisam ser reimpressas após o deploy.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Spring Boot | `EplConverterService.java:323-336` | `narrow = max(1, min(10, round(largDots/totalMods)))`; `wide = max(2, min(32, narrow*2))`; `largDots = max(1, px(wPx))` |
| Spring Boot | `EplConverterService.java:345-351` | Adicionado helper privado `modulosBarcode(String tipo, int len)` idêntico ao do ZPL |
| Spring Boot | `EplConverterServiceTest.java` (novo) | 8 testes JUnit 5 cobrindo Code 128 grande, Interleaved, edge case width=20, scaleX, wide=narrow*2, clamp, fallback EAN-13 |
| Angular | `cadastro-etiquetas-payload.spec.ts` (novo) | 15 specs Jest — regressão do contrato `width`/`scaleX` no payload de `gerarPreview` |
| Delphi | — | Confirmado código morto pelo `altis-delphi-agent`. Ticket futuro: remover `AddBar*` de `TEtiquetaPersonalizada` |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Spring Boot | `EplConverterServiceTest.java` | (1) Code 128 width=400 narrow≥4; (2) narrow≠2 (não-hardcoded); (3) Interleaved width=300 narrow≥3; (4) width=20 narrow≥1 sem exceção; (5) wide=narrow*2; (6) wide∈[2,32]; (7) scaleX=2 + width=200 ≡ scaleX=1 + width=400; (8) EAN-13 fallback Code 128 |
| Angular | `cadastro-etiquetas-payload.spec.ts` | Suite 1 (11 specs) — `canvas.toObject()` preserva `width`/`scaleX`/`tipo_codigo_barras`/`tipo_objeto`/9 props customizadas/`rotacaoEtiqueta`. Suite 2 (4 specs) — `EtiquetaPreviewService.gerarPreview()` envia `width`/`scaleX` no body do POST `/previewZpl` (com HttpTestingController) |

### Prevenção futura
- Adicionar regra de revisão: helpers de conversão Zpl/Epl devem ter paridade testada — se um recebe um parâmetro que afeta layout (ex: `wPx`), o outro também deve usar.
- Considerar refator extraindo `modulosBarcode` para `BarcodeUtils` (sugestão #1 do code-reviewer) eliminando duplicação.

### Lições aprendidas
- Bug existia desde a implementação original (sem commit introdutor) — o teste de regressão TDD nasceu para travar a paridade EPL/ZPL.
- Detecção pelo usuário via comparação visual com a rotina padrão de "Endereçamento de Estoque" (`_ImpressaoEtiquetasZebraEPL` + `_ImpressaoEtiquetas.AddBarEpl`) — boa prática: usar rotinas legadas estáveis como referência funcional ao diagnosticar bugs em rotinas novas.
- A unit Delphi `TEtiquetaPersonalizada.AddBar*` é código morto desde sempre — todo EPL/ZPL é gerado no Spring Boot e o Delphi só envia `Imprimir(pConteudoFinal)`.

## Resultado final

**Bugfix entregue. Aguardando duas validações humanas:**
1. Rodar localmente `mvnw.cmd test -Dtest=EplConverterServiceTest` em `Orientado a Objetos\SpringBoot\AltisClienteWs\` para fechar a etapa GREEN do TDD Spring (orquestrador não tinha rede para o maven wrapper).
2. Decidir o destino dos arquivos shared modificados na branch antes do bugfix (`input-group-check-box.component.ts`, `input-valor.component.ts`, `cadastro-etiquetas.component.ts` imports, `package-lock.json`) — devem ir em commit separado de migração de primitivos UI, não junto com este `fix(altiswssb)`.

Code review: 0 BLOQUEADOR / 5 ATENÇÃO / 4 SUGESTÃO. Todas as ATENÇÕES contornadas ou de domínio humano.
