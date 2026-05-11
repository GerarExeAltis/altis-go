# SPEC — Tipo "A4" em etiquetas personalizadas + rename ZEBRA_LINGUAGEM → LINGUAGEM_IMPRESSAO

**Gerado em:** 2026-05-05 18:33:13
**Solicitado por:** usuário
**Status:** concluído

## Descrição
Adicionar suporte ao tipo de impressão **A4** em etiquetas personalizadas (impressoras normais, papel A4 padrão). Quando o usuário seleciona `tipoImpressao = 'A4'` no cadastro:
- **Bloquear** os inputs de `larguraCm`, `alturaCm`, `resolucaoDpi` e `etiquetasPorLinha`.
- **Auto-preencher** com valores fixos: `21 × 29.7 cm`, `96 DPI`, `1 etiqueta/linha`.

Renomear a coluna `ZEBRA_LINGUAGEM` (Oracle) para `LINGUAGEM_IMPRESSAO` (mais descritivo, agora que vamos suportar formatos não-Zebra) e propagar o rename em todas as camadas (Spring Boot, Angular, Delphi).

A **geração** propriamente dita do conteúdo A4 (HTML/PDF a partir do `LAYOUT_JSON` Fabric.js) **NÃO está no escopo desta feature** — fica para ticket futuro. Esta feature apenas:
- Aceita `'A4'` como valor válido de `TIPO_IMPRESSAO`.
- Faz o rename da coluna em todas as camadas.
- Bloqueia/auto-preenche inputs no AltisW.
- No Delphi: análise da estrutura A4 atual + rename do campo (sem implementar geração).

## Regras de negócio

1. `TIPO_IMPRESSAO` passa a aceitar três valores: `'ZPL'`, `'EPL'`, `'A4'`. ALTER do CHECK constraint.
2. Quando `TIPO_IMPRESSAO = 'A4'`:
   - `LARGURA_CM = 21`, `ALTURA_CM = 29.7`, `RESOLUCAO_DPI = 96`, `ETIQUETAS_POR_LINHA = 1` (defaults aplicados pelo frontend; backend valida combinação).
   - O CLOB `LINGUAGEM_IMPRESSAO` fica **NULL** ou vazio (não armazena conteúdo pré-renderizado — A4 será gerado on demand a partir do `LAYOUT_JSON` em feature futura).
3. Quando `TIPO_IMPRESSAO ∈ {'ZPL','EPL'}`: comportamento atual mantido — `LINGUAGEM_IMPRESSAO` recebe o stream pronto via `ZplConverterService`/`EplConverterService`.
4. Coluna `LINGUAGEM_IMPRESSAO` precisa **relaxar `NOT NULL`** (ficar nullable) para permitir A4 sem conteúdo.
5. `ZplLayoutValidador.validar()` precisa **bypass** para `tipoImpressao = 'A4'` (não cair em validação ZPL/EPL).
6. UI Angular: ao mudar `tipoImpressao` para `'A4'`, fazer `disable()` dos 4 controls e `setValue()` com defaults A4. Ao mudar de volta para ZPL/EPL, reabilitar e zerar.

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Investigação `__recovery/` | Reportar diff entre as duas cópias de `_ImpressaoEtiquetasPersonalizadas.pas` (Repositório/Etiquetas/ vs __recovery/) — `altis.dpr:1519` referencia a __recovery | `altis-delphi-agent` (modo investigação) |
| Angular AltisW (lógica) | Rename `zebraLinguagem`→`linguagemImpressao` em model + form + 4 ocorrências no component; novo handler em `tipoImpressao` valueChanges para disable/auto-fill | `altis-angular-agent` |
| Angular AltisW (UI) | Adicionar opção `'A4'` no `altis-input-select`; estados visuais dos inputs desabilitados; constants `TIPOS_IMPRESSAO_DISPONIVEIS` | `altis-bootstrap5-agent` |
| Spring Boot | Rename Model/DTO/Service/Validador (`zebraLinguagem`→`linguagemImpressao`); `@ColunaAltis(nomeColunaOracle="LINGUAGEM_IMPRESSAO")`; `ZplLayoutValidador.validar()` bypass para `'A4'`; `EtiquetasPersonalizadasService` aceita `'A4'` (sem chamar Zpl/EplConverter) | `altis-spring-agent` |
| Oracle | (1) ALTER RENAME COLUMN ZEBRA_LINGUAGEM TO LINGUAGEM_IMPRESSAO; (2) ALTER CONSTRAINT CK_ETIQUETAS_PERS_TIPO_IMPRESSAO para incluir 'A4'; (3) ALTER COLUMN LINGUAGEM_IMPRESSAO NULL (relax NOT NULL); (4) atualizar `_ComandosUpdateDB_Matheus.pas` com script de migração; (5) atualizar comentário do constraint | `altis-oracle-agent` |
| Delphi (Piloto) | Rename `ZebraLinguagem`→`LinguagemImpressao` em `Banco/_EtiquetasPersonalizadas.pas` (record + INSERT/UPDATE/SELECT, 6 pontos); rename em `Repositório/Etiquetas/_ImpressaoEtiquetasPersonalizadas.pas:645` (consumidor); decidir se aplica nas DUAS cópias com base na investigação inicial; análise resumida da estrutura A4 atual (`EtiquetaEnderecoEstoqueA4.pas`) e como integrar no futuro (não implementar agora) | `altis-delphi-agent` |
| Code Review | Sempre | `altis-code-reviewer-agent` |

## Decisões tomadas
1. **Nome da coluna:** `LINGUAGEM_IMPRESSAO` (20 chars, suficientemente descritivo).
2. **Padrões A4:** retrato `21 × 29.7 cm`, DPI=96 (compatível com geração HTML/PDF web), 1 etiqueta/linha.
3. **Armazenamento A4:** **não persistir** — `LINGUAGEM_IMPRESSAO` fica NULL para A4. Geração on demand (futuro).
4. **`__recovery/`:** **investigar primeiro** (rodada inicial de análise) antes de qualquer modificação Delphi.
5. **Deploy:** **rename direto** (atomico) — `ALTER RENAME COLUMN` no update.sql + redeploy SIMULTÂNEO de Spring `.jar` + Angular bundle + Piloto `.exe`. Janela coordenada de manutenção.
6. **Escopo Delphi:** análise da estrutura A4 (read-only) + rename do campo (mecânico). Geração A4 (PDF/HTML/QuickReport) **fora desta feature** — ticket futuro.

## Restrições e observações

- **Multi-empresa:** `ETIQUETAS_PERSONALIZADAS` **não tem `EMPRESA_ID`** (cadastro globalizado por `ROTINA_ID`). Sem filtro adicional em queries.
- **Sem impacto fiscal:** etiqueta de gôndola/produto/endereço — não toca CST/CFOP/NCM/SPED.
- **Sem impacto em integrações externas:** SEFAZ/SiTef/Inter/WhatsApp não afetados.
- **Sincronização (`STATUS_SINCRONIZACAO`):** confirmar que não há robô externo (Python/`AltisService*`) lendo `ZEBRA_LINGUAGEM` por nome — pre-flight não localizou consumidor de sync, mas usuário precisa confirmar antes do rename em produção.
- **Tela de cadastro Delphi:** o cadastro de etiquetas personalizadas é feito **apenas pelo AltisW** (não há `CadastroEtiquetasPersonalizadas.pas` no Piloto). O Piloto só consome (impressão via `Etiquetas.pas`, `RelacaoEnderecosEstoque.pas`).
- **`_ImpressaoEtiquetasPersonalizadas.AddBar` (Delphi)** tem `if 'ZPL' then ... else AddBarEpl` — não trata `'A4'`. Como bugfix anterior confirmou que `AddBar*` é código morto, não há ação imediata; apenas registrar no relatório de análise.
- **Ordem de execução** (solicitada pelo usuário): Angular → Spring Boot → Oracle → Delphi.
- **Rodada 0** (investigação `__recovery/`): pode rodar em paralelo com Angular para não atrasar.

## Pre-flight
🔴 VERMELHO inicialmente — rebaixado para 🟡 AMARELO após confirmações do usuário (5 decisões fechadas: nome coluna, padrões A4, não persistir, __recovery investigar, rename direto). Risco residual: deploy não-atômico → mitigado por janela coordenada.
