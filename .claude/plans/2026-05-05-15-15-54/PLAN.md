# BUGFIX PLAN — Valor do barcode em etiqueta personalizada de Endereço de Estoque é mais curto que o legado

**Gerado em:** 2026-05-05 15:15:54
**SPEC:** ../../specs/2026-05-05-15-15-54/SPEC.md
**Tipo:** bugfix
**Severidade:** P2
**Status:** concluído

## Rodadas de execução

### Rodada 1 — TDD Delphi (Red→Green→Refactor)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Delphi | Substituir `retornarNumeros(...)` em `RelacaoEnderecosEstoque.pas:695` por `LPad(NFormatN(SFormatInt(...)), 12, '0')` espelhando `_ImpressaoEtiquetas.pas:864`. Cobrir com DUnitX se factível (extrair helper testável) | altis-delphi-agent | em andamento |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Revisão final de aderência | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Delphi (Piloto)
- **MODIFICADO:** `Orientado a Objetos\Piloto\RelacaoEnderecosEstoque.pas` linha 695: `retornarNumeros(...)` → `NFormatZeros(SFormatInt(...), 12)`. Helper canônico do projeto (definido em `_BibliotecaGenerica.pas:2863`); mais robusto que `LPad(NFormatN(id), 12, '0')` do legado pois `NFormatN` retorna `''` para `0` e usa ponto-de-milhar para valores ≥ 1000. (Bonus: `;;` duplicado em `uses` foi removido oportunisticamente.)
- **NOVO:** `Orientado a Objetos\Piloto\Testes\TestFormatacaoBarcodeEnderecoEstoque.pas` — 6 testes DUnitX cobrindo Id pequeno, Id=1, Id máximo Int32, Id=0, garantia `Length=12` e ausência de ponto de milhar.
- **MODIFICADO:** `Orientado a Objetos\Piloto\Testes\altisTestes.dpr` linha 150: registro da nova unit de teste.

### Não tocado (revertido após code review)
- `Orientado a Objetos\Piloto\RelacaoEnderecosEstoque.dfm` — alterações do save da IDE (TabOrder 9→11, remoção do BOM UTF-8, `Height=14` em 5 labels) revertidas via `git checkout` para manter escopo cirúrgico.

## RCA (Root Cause Analysis)

### Resumo
Ao migrar a impressão de etiquetas de endereço de estoque para o caminho de etiquetas personalizadas (template Spring Boot + GerarConteudo), perdeu-se a transformação `LPad(...,12,'0')` aplicada no caminho legado. Resultado: barcode com poucos módulos, ilegível em scanner.

### Causa raiz
`RelacaoEnderecosEstoque.imprimirEtiquetasPersonalizadas` (linha 695 antes do fix) injetava no placeholder `CEI` apenas os dígitos crus do `EnderecoEstoqueId` (via `retornarNumeros(...)`). O caminho legado `_ImpressaoEtiquetas.pas:864` (`MontarEtiquetasLayout`) sempre aplicou pad de 12 zeros à esquerda. A paridade não foi replicada na nova rota.

### Linha do tempo
- **Introduzido em:** quando a tela `RelacaoEnderecosEstoque` ganhou o caminho de etiquetas personalizadas (`imprimirEtiquetasPersonalizadas`) — sem commit específico identificado, mas precede o ticket atual.
- **Detectado em:** 2026-05-05 — usuário relatou comparando com a impressão do caminho legado da mesma tela.
- **Corrigido em:** 2026-05-05 ~15:30.

### Impacto
- **Usuários afetados:** todas as empresas que imprimem etiquetas personalizadas para endereço de estoque pela tela `Relação de Endereços de Estoque`.
- **Dados corrompidos:** Não — defeito puramente visual no barcode.

### Correção aplicada
| Camada | Arquivo | O que foi alterado |
|---|---|---|
| Delphi | `RelacaoEnderecosEstoque.pas:695` | `retornarNumeros(...)` → `NFormatZeros(SFormatInt(...), 12)` |
| Delphi (testes) | `Testes/TestFormatacaoBarcodeEnderecoEstoque.pas` (novo) | 6 cenários cobrindo formatação esperada |
| Delphi (build) | `Testes/altisTestes.dpr:150` | Registra nova unit no projeto de testes |

### Testes adicionados
| Camada | Arquivo de teste | Cenário coberto |
|---|---|---|
| Delphi | `TestFormatacaoBarcodeEnderecoEstoque.pas` | (1) `42 → '000000000042'`; (2) `1 → '000000000001'`; (3) `MaxInt → '002147483647'`; (4) `0 → '000000000000'`; (5) Length=12 sempre; (6) sem ponto de milhar |

> Limitação reconhecida (atenção #1 do code review): o teste valida `NFormatZeros` (helper canônico) através de uma função local, não a linha 695 do form. É spec-test, não regressão real do form. Defensável para P2 de uma linha; mantido por escolha consciente do usuário para não inflar a API pública do form.

### Bug latente identificado fora do escopo (sugestão #2 do code review)
`_ImpressaoEtiquetas.pas:864` (em `Repositório/Etiquetas/`, pasta sensível) usa `LPad(NFormatN(id), 12, '0')` — para `id=1234` produz `'0000001.234'` (ponto de milhar do `NFormatN`). O fix nesta tela ficou MAIS correto que o legado. Recomendação documentada aqui para ticket separado: trocar legado por `NFormatZeros(EnderecoEstoqueId, 12)` (como nesta tela). NÃO alterado neste bugfix porque toca pasta sensível e foi explícita decisão do usuário não criar follow-up agora.

### Prevenção futura
- Quando uma tela migrar de uma rotina antiga para outra (template-based ou backend-based), conferir paridade de transformações de campo (padding, formatação, encoding) entre as rotas. Adicionar à checklist de migração.
- Considerar centralizar a função `formatarBarcodeEnderecoEstoque(pId)` em uma unit utilitária quando houver consenso sobre a regra (12 zeros, sem milhar) para evitar a próxima divergência.

### Lições aprendidas
- Helpers canônicos do projeto (`NFormatZeros`, `SFormatInt`) podem ser superiores aos usados em código legado — não copiar literalmente o legado quando há alternativa mais robusta no `_BibliotecaGenerica`.
- Save da IDE Delphi pode introduzir mudanças não declaradas em `.dfm` (TabOrder, BOM, Height) — sempre revisar `git diff` em `.dfm` após editar e reverter o que estiver fora do escopo.

## Resultado final

**Bugfix entregue.** Escopo cirúrgico: 1 linha de produção alterada + suíte de teste DUnitX + registro no `.dpr` do projeto de testes. Sem bloqueadores no code review.

**Validação humana pendente:**
- Rodar `altisTestes.exe --exitbehavior=Halt` (ou F9 no RAD Studio sobre `altisTestes.dproj`) para validar a suíte completa de testes DUnitX. Orquestrador não tem toolchain Delphi.

**Aprovação code review:** 0 BLOQUEADOR · 5 ATENÇÃO (1 resolvida via revert do `.dfm`; 4 documentadas e aceitas pelo usuário) · 3 SUGESTÃO.
