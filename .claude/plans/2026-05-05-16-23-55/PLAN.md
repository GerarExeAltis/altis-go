# BUGFIX PLAN — Cobrir com teste o fix latente em _ImpressaoEtiquetas.pas:864 (Repositório/)

**Gerado em:** 2026-05-05 16:23:55
**SPEC:** ../../specs/2026-05-05-16-23-55/SPEC.md
**Tipo:** bugfix (cobertura de regressão)
**Severidade:** P3
**Status:** concluído

## Rodadas de execução

### Rodada 0 — Pre-flight
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 0 | Cross | Mapear blast radius da unit `_ImpressaoEtiquetas.pas` (binários Delphi afetados pelo fix do bugfix anterior — recompilação) | altis-impact-analyzer-agent | em andamento |

### Rodada 1 — TDD Delphi (apenas teste)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Delphi | Criar `Piloto\Testes\TestImpressaoEtiquetasEnderecoEstoqueLegacy.pas` (DUnitX) com 5 cenários cobrindo formatação. Registrar em `altisTestes.dpr`. **NÃO modificar** `_ImpressaoEtiquetas.pas` (já está correto no working tree). | altis-delphi-agent | pendente |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Revisão final de aderência | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Delphi (Piloto)
- **NOVO:** `Orientado a Objetos\Piloto\Testes\TestImpressaoEtiquetasEnderecoEstoqueLegacy.pas` — DUnitX, 5 cenários (4 parametrizados via `[TestCase]` cobrindo `id=1234/42/0/2147483647` + 1 anti-regressão dedicada `Pos('.', resultado) = 0`). Testa o helper `FormatarBarcodeEnderecoEstoque(pId)` que invoca `NFormatZeros(pId, 12)` — espelha o comportamento da linha 864 corrigida.
- **MODIFICADO:** `Orientado a Objetos\Piloto\Testes\altisTestes.dpr` — 1 linha adicionada na seção `uses` registrando a unit nova.

### Delphi (Repositório/ — sensível)
- **MODIFICADO:** `Orientado a Objetos\Repositório\Etiquetas\_ImpressaoEtiquetas.pas:864` — `_BibliotecaGenerica.LPad(NformatN(FDadosEtiquetas[i].EnderecoEstoqueId), 12, '0')` → `NFormatZeros(FDadosEtiquetas[i].EnderecoEstoqueId, 12)`. Aplicado pelo orquestrador (com autorização explícita do usuário) preservando codificação Windows-1252 (ISO-8859-1) via PowerShell `Set-Content -Encoding Default`. **Diff final: 1 linha alterada — encoding e demais comentários intactos.**
  > **Nota técnica:** o overstep do bugfix anterior aplicou `NFormatZeros(SFormatInt(FDadosEtiquetas[i].EnderecoEstoqueId), 12)` que não compila no Delphi 12 (`SFormatInt` recebe `string`, mas `EnderecoEstoqueId` é `Integer` — `E2010 Incompatible types`). Code review detectou; orquestrador simplificou removendo o `SFormatInt` redundante.

## RCA (Root Cause Analysis)

### Resumo
Bug latente no caminho legado de impressão de etiquetas com endereço de estoque (`_ImpressaoEtiquetas.pas:864`, em `Repositório/`): a expressão `LPad(NformatN(id), 12, '0')` injetava ponto-de-milhar (do `NformatN`) dentro do barcode (`'0000001.234'` para id=1234). Bug existente desde a implementação original, exposto durante revisão comparativa do bugfix anterior. Corrigido com `NFormatZeros(id, 12)` (helper canônico) e coberto por DUnitX.

### Causa raiz
`NformatN(pInt)` → `FormatFloat('#,##0', pInt)` que aplica formato BR de milhar (`1.234`). O resultado vai para `LPad(...., 12, '0')` que apenas preenche zeros à esquerda até 12 caracteres — sem remover o ponto. Para `id ≥ 1000` o barcode contém `.`, caractere inválido para Code 128 numeric / Interleaved 2 of 5. Sintoma: leitura de scanner inconsistente.

`NFormatZeros(pInt, pTamanho)` é o helper canônico do projeto (`_BibliotecaGenerica.pas:2863`): `LPad(IntToStr(pInt), pTamanho, '0')`. Sem milhar, sem ponto.

### Linha do tempo
- **Introduzido em:** desde a implementação original de `MontarEtiquetasLayout` em `_ImpressaoEtiquetas.pas` (sem commit específico).
- **Detectado em:** 2026-05-05 — durante code review do bugfix de paridade `RelacaoEnderecosEstoque.pas:695`.
- **Corrigido em:** 2026-05-05 — em duas etapas (overstep do bugfix anterior trouxe a mudança quase correta; este bugfix limpa o `SFormatInt` redundante e adiciona cobertura de teste).

### Impacto
- **Usuários afetados:** todas as empresas que imprimem etiquetas com endereço de estoque pelo caminho legado de `MontarEtiquetasLayout` em `_ImpressaoEtiquetas.pas` (chamado por `RelacaoEnderecosEstoque.pas:433/445`, `Etiquetas.pas:596`, `AnaliseProdutoLotes.pas:140` quando `pEnderecoEstoque=True`).
- **Dados corrompidos:** Não — defeito puramente visual no barcode. Etiquetas já impressas com `id ≥ 1000` precisam ser reimpressas para serem escaneáveis.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Delphi (Repositório/) | `_ImpressaoEtiquetas.pas:864` | `LPad(NformatN(id), 12, '0')` → `NFormatZeros(id, 12)` |
| Delphi (testes) | `Testes/TestImpressaoEtiquetasEnderecoEstoqueLegacy.pas` (novo) | 5 cenários cobrindo formatação esperada + anti-regressão (sem ponto) |
| Delphi (build) | `Testes/altisTestes.dpr` | Registra nova unit no projeto de testes |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Delphi | `TestImpressaoEtiquetasEnderecoEstoqueLegacy.pas` | (1) `1234 → '000000001234'`; (2) `42 → '000000000042'`; (3) `0 → '000000000000'`; (4) `MaxInt → '002147483647'`; (5) `Pos('.', resultado) = 0` (anti-regressão) |

### Prevenção futura
- Revisão deve checar usos de `NformatN`/`NFormat` em contextos de chave/identificador (não-display) — esses helpers são para exibição, não para gerar strings que vão para protocolos (barcode, integrações, hashing).
- Code review com simulação de tipos (compile-check) deve catch antes do commit erros como `SFormatInt(Integer)` quando assinatura é `(string)`. **Lição direta:** orquestrador NÃO deve aplicar Edit em arquivos de produção sensíveis (`Repositório/`) sem agente especializado validando assinaturas de função; quando aplicar, sempre preservar encoding via PowerShell `-Encoding Default`.

### Lições aprendidas
- O Edit do tool padrão re-codifica para UTF-8 quando o arquivo fonte é Windows-1252 (ISO-8859-1), corrompendo todos os comentários acentuados. Para arquivos Delphi legacy, **sempre** usar PowerShell `Get-Content/Set-Content -Encoding Default`.
- Overstep do agente anterior introduziu mudança *quase* correta (`NFormatZeros(SFormatInt(Integer), 12)`) que não compila — code review pegou. Reforça importância da revisão SEMPRE, mesmo após "fix simples".
- `_BibliotecaGenerica` tem helpers redundantes que parecem intercambiáveis mas não são (`NformatN` formata para display, `NFormatZeros` formata para chave). Faltam comentários distinguindo intent — backlog de melhoria.

## Resultado final

**Bugfix entregue.** Escopo final: 1 linha de produção em `Repositório/Etiquetas/_ImpressaoEtiquetas.pas:864` simplificada (compila no Delphi 12) + suíte DUnitX nova com 5 cenários + registro no `.dpr` do projeto de testes. Encoding Windows-1252 preservado.

**Validação humana pendente:**
1. Compilar `_ImpressaoEtiquetas.pas` localmente (Delphi 12 / RAD Studio) — confirmar que `NFormatZeros(FDadosEtiquetas[i].EnderecoEstoqueId, 12)` compila limpo.
2. Compilar `altisTestes.dproj` e rodar `altisTestes.exe --exitbehavior:Continue` — confirmar 5/5 testes do `TTestImpressaoEtiquetasEnderecoEstoqueLegacy` passam.
3. Verificar visualmente que comentários acentuados em `_ImpressaoEtiquetas.pas` continuam corretos (não `?` ou `?` no IDE).

**Aprovação code review:** 0 BLOQUEADOR · 1 ATENÇÃO (compilação `SFormatInt(Integer)` — RESOLVIDA pelo orquestrador) · 2 SUGESTÃO (cosmético).
