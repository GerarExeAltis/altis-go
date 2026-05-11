# BUGFIX SPEC — Valor do barcode em etiqueta personalizada de Endereço de Estoque é mais curto que o legado

**Gerado em:** 2026-05-05 15:15:54
**Tipo:** bugfix
**Severidade:** P2
**Ambiente:** produção
**Status:** concluído

## Descrição do bug
Ao imprimir uma etiqueta personalizada de Endereço de Estoque pelo form `RelacaoEnderecosEstoque`, o valor do código de barras (placeholder `CEI`) chega à impressora com apenas os dígitos crus do `EnderecoEstoqueId` (ex: `"42"`). No fluxo legado da mesma tela (`MontarEtiquetasLayout` em `_ImpressaoEtiquetas.pas`), o valor é zero-padded para **12 caracteres** (`"000000000042"`), tornando o barcode visualmente maior, com mais módulos e mais legível por scanners de longa distância.

## Passos para reproduzir
1. Em `Relação de Endereços de Estoque`, selecionar uma etiqueta personalizada no `cbbEtiquetasLayoutsPersonalizadas`.
2. Selecionar uma ou mais linhas e imprimir.
3. Comparar com a impressão pelo botão antigo (sem combo de etiqueta personalizada selecionada → `MontarEtiquetasLayout` legado).
4. Resultado: barcode da etiqueta personalizada é menor (poucos dígitos), o legado é maior (12 dígitos).

## Comportamento esperado
O valor do placeholder `CEI` injetado em `GerarConteudo` deve ser `LPad(NFormatN(EnderecoEstoqueId), 12, '0')` — exatamente como `_ImpressaoEtiquetas.pas:864`.

## Comportamento atual
Em `RelacaoEnderecosEstoque.pas:695` o valor enviado é `retornarNumeros(sgEnderecosEstoque.Cells[caCodigo, i])` — apenas extrai dígitos da célula, sem o pad.

## Causa raiz
**Arquivo:** `Orientado a Objetos/Piloto/RelacaoEnderecosEstoque.pas`
**Função:** `imprimirEtiquetasPersonalizadas`
**Linha:** 695

```pascal
vDados[High(vDados)].Valores :=
  [sgEnderecosEstoque.Cells[caRua, i],
   sgEnderecosEstoque.Cells[caEstante, i],
   sgEnderecosEstoque.Cells[caNivel, i],
   sgEnderecosEstoque.Cells[caVao, i],
   retornarNumeros(sgEnderecosEstoque.Cells[caCodigo, i])];   // <-- apenas dígitos crus
```

Ao migrar a impressão para o caminho de etiquetas personalizadas (que usa template via Spring Boot), a transformação `LPad(NFormatN(...), 12, '0')` aplicada em `_ImpressaoEtiquetas.pas:864` não foi replicada — perdeu-se a paridade de formato entre as duas rotas.

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Delphi — `RelacaoEnderecosEstoque.pas:695` | Linha única — substituir `retornarNumeros(...)` por `LPad(NFormatN(SFormatInt(...)), 12, '0')` | `altis-delphi-agent` |

**Não afetados:** Spring Boot (recebe valor pronto), Angular (só template), banco (sem schema).

## Testes TDD planejados
| Camada | Cenário de teste | Framework | Status |
|---|---|---|---|
| Delphi | Função `formatarValorEnderecoEstoqueParaBarcode(EnderecoEstoqueId: Integer): string` (extrair se possível para testabilidade) deve retornar `"000000000042"` para input `42` | DUnitX | pendente |
| Delphi (alternativo) | Se extrair função não fizer sentido, criar teste apenas do helper inline ou apenas validação manual + comentário/asserção | DUnitX | pendente |

## Riscos de regressão
- **Baixíssimo:** fix isolado a uma única linha em tela específica (`RelacaoEnderecosEstoque`). Não toca `Repositório/`, não afeta outros forms nem services.
- **Atenção:** `LPad` para 12 dígitos só faz sentido se o ID do endereço cabe em 12 dígitos (cabe — Oracle SEQUENCE não estoura 12 dígitos antes de bilhões de registros).
- O placeholder `CEI` da etiqueta personalizada precisa continuar sendo string — não muda contrato.

## Decisões tomadas
- Usuário confirmou: **manter os 12 dígitos** (paridade exata com legado `_ImpressaoEtiquetas.pas:864`).
- Pre-flight dispensado — fix de UMA LINHA em arquivo não-shared (não está em `Repositório/`), sem impacto fiscal/integração/multi-empresa. Blast radius do diretório de etiquetas já mapeado no SPEC anterior (2026-05-05-12-21-20).
- Sem necessidade de fiscal-agent nem integracoes-agent.
