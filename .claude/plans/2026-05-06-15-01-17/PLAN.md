# PLAN — Implementar impressão A4 de etiqueta personalizada no Delphi

**Gerado em:** 2026-05-06 15:01:17
**SPEC:** ../../specs/2026-05-06-15-01-17/SPEC.md
**Status:** concluído

## Rodadas de execução

### Rodada 1 — Delphi (single agent, 3 arquivos)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Delphi | (a) Criar `Piloto\EtiquetaPersonalizadaA4.pas` + `.dfm` herdando `TFormHerancaImpressoesPrincipal`, com QuickReport (banda detail) + N TQRLabel genéricos + 1 TQRBarcode + `setDados(pCampos, pDados)` + `BeforePrint`/`NeedData`. (b) Modificar `Piloto\Etiquetas.pas:854` adicionando bifurcação `if TipoImpressao='A4' then ... else ...`. (c) Modificar `Piloto\RelacaoEnderecosEstoque.pas:706` com a mesma bifurcação. (d) Adicionar units no `altis.dpr`/`altis.dproj`. | altis-delphi-agent | em andamento |

### Rodada 2 — Code review
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 2 | Cross | Validar aderência ao padrão existente (EtiquetaModelo4/EtiquetaEnderecoEstoqueA4), Sessao.AbrirTela, Informar/Exclamar/Perguntar, encoding UTF-8 BOM, escopo cirúrgico (não tocar Repositório/) | altis-code-reviewer-agent | pendente |

## Arquivos criados/modificados

### Delphi (Piloto)
- **NOVO** `Orientado a Objetos\Piloto\EtiquetaPersonalizadaA4.pas` — `TFormEtiquetaPersonalizadaA4` herdando `TFormHerancaImpressoesPrincipal`. Cria `TQRLabel` dinamicamente baseado em `Length(FCampos)` (sem limite). Constructor padrão herdado da base (`Create(0)`). Inicialização lazy de `FComponentesDinamicos` em `setDados`. Helper `aplicarFonteCampo`. Constants `cYBase=56`, `cAlturaLinha=32`, `cFonteNome='Tahoma'`, `cFonteSize=14`. **Slots criados UMA vez** (na primeira banda); iterações seguintes só atualizam Caption. **`qrBandDetail.Height` recalculado dinamicamente**. **Parâmetro `pCampoCodigoBarras: string = 'CEI'`** em `setDados` para mapear o campo do barcode pelo nome (não pela posição). **`Quantidade` respeitada** via `FCopiaAtual` em `NeedData`. Owner dos labels é `qrBandDetail` — VCL libera automaticamente; destructor libera só a `TList`.
- **NOVO** `Orientado a Objetos\Piloto\EtiquetaPersonalizadaA4.dfm` — minimal: page A4 portrait margens 100, qrBandDetail (KeepOnOnePage=True, BandType=rbDetail), qrTitulo (Tahoma 22pt bold center), qrBarCode (bcCode128C 460x108 narrow=3 wide=5), qrCodigoBarras (Tahoma 12pt center).
- **MOD** `Orientado a Objetos\Piloto\Etiquetas.pas:12` — adicionado `EtiquetaPersonalizadaA4` no `uses`.
- **MOD** `Orientado a Objetos\Piloto\Etiquetas.pas:852-867` — bifurcação `if vEtiquetas[0].TipoImpressao='A4' then ... TFormEtiquetaPersonalizadaA4.Create(0); setDados(..., 'CEI'); Imprimir; else ... fluxo atual ZPL/EPL`.
- **MOD** `Orientado a Objetos\Piloto\RelacaoEnderecosEstoque.pas:14` — adicionado `EtiquetaPersonalizadaA4` no `uses`.
- **MOD** `Orientado a Objetos\Piloto\RelacaoEnderecosEstoque.pas:704-722` — mesma bifurcação no `imprimirEtiquetasPersonalizadas`. Passa `'CEI'` como `pCampoCodigoBarras`.
- **MOD** `Orientado a Objetos\Piloto\altis.dpr:448` — registrada unit nova.
- **MOD** `Orientado a Objetos\Piloto\altis.dproj:1397-1399` — `<DCCReference Include="EtiquetaPersonalizadaA4.pas">`.

### Total: 2 novos + 4 modificados (Etiquetas.pas, RelacaoEnderecosEstoque.pas, altis.dpr, altis.dproj)

## Resultado final

**Feature MVP entregue.** Implementação A4 no Delphi seguindo o padrão `TFormHerancaImpressoesPrincipal` + `TQuickRep` dos forms-irmãos `EtiquetaModelo4.pas` e `EtiquetaEnderecoEstoqueA4.pas`. Diferencial: criação **dinâmica** de `TQRLabels` em runtime baseada em `Length(FCampos)` (sem limite fixo de campos), com substituição de placeholders dinâmicos via `pCampos[i] → FDados[FPosicao].Valores[i]`.

### Bifurcação por tipo
- `tipoImpressao = 'A4'` → `TFormEtiquetaPersonalizadaA4` + QuickReport + impressora padrão Windows
- `tipoImpressao = 'ZPL'/'EPL'` → fluxo existente intacto via `TEtiquetaPersonalizada` (impressora térmica)

### Code review
**1ª iteração:** 2 BLOQUEADORES (constructor `Create(AOwner)` quebrado para uma classe-base que reintroduce `Create(pMovimentoId: Integer)`; double-free risk de `TQRLabel` Owned por `qrBandDetail`).
**2ª iteração após correções:** todos os 7 pontos endereçados. Aguardando re-review humana no RAD Studio (validação manual obrigatória — sem testes automatizados para QuickReport visual).

### Correções aplicadas após code review
1. **Constructor removido** — usa o `Create(pMovimentoId: Integer)` herdado da base. Inicialização lazy de `FComponentesDinamicos` em `setDados`.
2. **Destructor simplificado** — libera apenas a `TList<TQRLabel>`; os labels Owned por `qrBandDetail` são liberados pelo VCL automaticamente.
3. **Slots criados UMA vez** — `if FComponentesDinamicos.Count = 0 then construirSlots;` no `BeforePrint`. Iterações seguintes só atualizam `Caption` via `atualizarSlots(FPosicao)`. Performance + zero double-free.
4. **`qrBandDetail.Height` dinâmico** — recalculado ao final do `BeforePrint` para acomodar N campos + barcode + margem.
5. **`pCampoCodigoBarras: string = 'CEI'`** — parâmetro novo em `setDados`. Form busca pelo nome no `FCampos` (helper `indiceCampoCodigoBarras`). Em `Etiquetas.pas` (15 campos com `VAL` no fim), o barcode usa `CEI` (índice 13), não o último.
6. **`Quantidade` respeitada** — `FCopiaAtual` rastreado em `NeedData`. Para `RecDadoEtiqueta.Quantidade=N`, imprime N cópias por registro.
7. **Chamadores atualizados** — `Create(0)` em vez de `Create(nil)` (compatível com a base que recebe `pMovimentoId: Integer = 0`); `'CEI'` passado explicitamente como `pCampoCodigoBarras` em ambos os callers.

### Atenções pendentes (do code review, registradas mas aceitas como cosmético/futuro)
- Acoplamento com `_ImpressaoEtiquetasPersonalizadas` apenas para `RecDadoEtiqueta` — débito técnico aceito (mover para unit neutra é refator separado).
- Bloco de bifurcação `if TipoImpressao='A4' then ... else ...` duplicado em `Etiquetas.pas` e `RelacaoEnderecosEstoque.pas` — extrair helper utilitário fica para iteração 2.
- `cAlturaLinha=32` proporcional a `cFonteSize=14` — mudança futura de fonte exige ajustar manualmente.

### Validação humana obrigatória
1. Compilar `altis.dproj` no RAD Studio 12 — confirmar 0 erros.
2. Abrir `EtiquetaPersonalizadaA4.dfm` no Designer — verificar se os event handlers `qrBandDetailBeforePrint`/`qrRelatorioA4BeforePrint`/`qrRelatorioA4NeedData` estão amarrados ao QuickReport herdado.
3. Cadastrar uma etiqueta personalizada com `tipoImpressao='A4'` no AltisW.
4. Em `RelacaoEnderecosEstoque`, selecionar a etiqueta A4 e endereços — confirmar preview A4 com campos RUA/EST/NIV/VAO/CEI + barcode do CEI.
5. Em `Etiquetas`, selecionar a etiqueta A4 e produtos — confirmar preview A4 com 15 campos + barcode do CEI (não VAL).
6. Validar `Quantidade > 1` — confirmar N cópias da mesma etiqueta no preview.
7. Validar campo de barcode ausente — etiqueta sem `'CEI'` em `cCampos` deve ocultar `qrBarCode`/`qrCodigoBarras` (Enabled=False).

### Tickets follow-up sugeridos
- **Extrair `RecDadoEtiqueta`** para unit neutra (`_RecordsEtiqueta.pas`) eliminando dep desnecessária com `_ImpressaoEtiquetasPersonalizadas`.
- **Helper `imprimirEtiquetaPersonalizada(...)`** consolidando bifurcação ZPL/EPL/A4 em uma unit utilitária.
- **Validação de payload barcode** — se `vValorBarcode` tem caracteres não-numéricos, `bcCode128C` (subset C) falha. Hoje só checamos vazio. Adicionar `retornarNumeros(vValorBarcode) <> ''` ou trocar para `bcCode128`/`bcCode128A`/`bcCode128B` conforme conteúdo.
- **Suporte a múltiplas etiquetas por página A4** — atualmente cada `RecDadoEtiqueta` ocupa uma página inteira (KeepOnOnePage=True na banda). Para densidades maiores (ex: 4 etiquetas por A4), implementar layout em grid.
