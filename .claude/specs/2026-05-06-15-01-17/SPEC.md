# SPEC — Implementar impressão A4 de etiqueta personalizada no Delphi

**Gerado em:** 2026-05-06 15:01:17
**Solicitado por:** usuário
**Status:** concluído

## Descrição
Implementar no Piloto Delphi a impressão de etiquetas personalizadas com `tipoImpressao = 'A4'` (já aceito por Spring/Oracle/Angular desde a feature `2026-05-05-18-33-13`). MVP funcional com **layout A4 fixo padronizado** (similar a `EtiquetaModelo4.pas` e `EtiquetaEnderecoEstoqueA4.pas`), usando QuickReport via `TFormHerancaImpressoesPrincipal`, com **substituição de placeholders dinâmicos** (campos genéricos como `RUA`, `EST`, `CEI`, `NOME_PRODUTO`, `CODIGO_BARRAS` etc., conforme já definidos em chamadas atuais a `TEtiquetaPersonalizada.GerarConteudo`).

## Regras de negócio

1. **Bifurcação por `tipoImpressao`:** quando `'A4'`, usar o novo form `TFormEtiquetaPersonalizadaA4` (papel A4, impressora padrão Windows). Quando `'ZPL'`/`'EPL'`, fluxo atual via `TEtiquetaPersonalizada` (impressora térmica) — preservado intacto.
2. **Layout fixo:** o form A4 tem campos posicionados em design-time (.dfm), com N `TQRLabel` genéricos (`qrCampo01..qrCampoNN`) + 1 `TQRBarcode`. Cada slot é preenchido em runtime mapeando `pCampos[i] → pDados[FPosicao].Valores[i]`. Slots não usados ficam ocultos.
3. **Não parseia `LAYOUT_JSON` do Fabric.js** (decisão MVP — o canvas desenhado no AltisW só serve para preview/EPL/ZPL; A4 usa template fixo do Delphi).
4. **Contrato preservado:** `setDados(pCampos: TArray<string>; pDados: TArray<RecDadoEtiqueta>)` recebe a mesma estrutura que `TEtiquetaPersonalizada.GerarConteudo` consome — facilita a bifurcação nos chamadores.

## Camadas afetadas

| Camada | Impacto | Agente |
|---|---|---|
| Delphi (Piloto) — NOVO form | `Piloto\EtiquetaPersonalizadaA4.pas` + `.dfm` herdando `TFormHerancaImpressoesPrincipal` com QuickReport, N campos genéricos + barcode, `setDados`, `BeforePrint`, `NeedData` | `altis-delphi-agent` |
| Delphi (Piloto) — MOD `Etiquetas.pas:854` | Bifurcação no botão de impressão: `if TipoImpressao = 'A4'` → instancia A4 + setDados + Imprimir; senão atual `TEtiquetaPersonalizada` | `altis-delphi-agent` |
| Delphi (Piloto) — MOD `RelacaoEnderecosEstoque.pas:706` | Mesma bifurcação no método `imprimirEtiquetasPersonalizadas` | `altis-delphi-agent` |
| Code Review | Sempre | `altis-code-reviewer-agent` |

## Decisões tomadas

1. **Caminho arquitetônico:** Path B variante simplificada — Delphi nativo com QuickReport e layout fixo (não parseia LAYOUT_JSON do Fabric.js).
2. **Acionamento:** mesma tela `Etiquetas.pas` (e `RelacaoEnderecosEstoque.pas`); bifurcação por `tipoImpressao`.
3. **Escopo MVP:** campos genéricos via placeholders. Casos específicos (preview avançado, múltiplas etiquetas/página, margens custom) ficam para iterações futuras.
4. **Quantidade de campos no template:** **agente Delphi decide** com base em `EtiquetaModelo4.pas`/`EtiquetaEnderecoEstoqueA4.pas` e nos consumidores atuais (`cCampos = ['RUA','EST','NIV','VAO','CEI']` em `RelacaoEnderecosEstoque.pas:707` e equivalentes em `Etiquetas.pas`).
5. **Pre-flight dispensado** — escopo cirúrgico em arquivos não-sensíveis (form Delphi novo + 2 mods em telas específicas do Piloto). Não toca `Repositório/`, `_BibliotecaGenerica`, `_Sessao`, SQL, services compartilhados, integrações externas. Multi-empresa N/A (etiquetas personalizadas não têm `EMPRESA_ID`).

## Restrições e observações

- **NÃO tocar** em `Repositório/Etiquetas/__recovery/_ImpressaoEtiquetasPersonalizadas.pas` nem `Repositório/Etiquetas/_ImpressaoEtiquetasPersonalizadas.pas` — `TEtiquetaPersonalizada` continua para ZPL/EPL exclusivamente.
- **NÃO criar tela de preview customizada** — usar QuickReport preview padrão herdado de `TFormHerancaImpressoesPrincipal`.
- **Encoding UTF-8 BOM** nos arquivos `.pas` Delphi (padrão do Piloto, conforme bugfix `2026-05-05-15-15-54`).
- **Sem `ShowMessage`/`Form.Create`** — usar `Sessao.AbrirTela`/`Informar`/`Exclamar` do `_BibliotecaGenerica`.
- **Build local pendente** — orquestrador não tem RAD Studio; usuário compila e valida.
- **Sem TDD obrigatório** para form QuickReport com componentes visuais (DUnitX é fraco para testes de UI Delphi). Validação manual no RAD Studio + impressão real.
