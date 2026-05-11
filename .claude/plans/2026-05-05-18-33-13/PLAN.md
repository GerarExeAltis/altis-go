# PLAN — Tipo "A4" em etiquetas personalizadas + rename ZEBRA_LINGUAGEM → LINGUAGEM_IMPRESSAO

**Gerado em:** 2026-05-05 18:33:13
**SPEC:** ../../specs/2026-05-05-18-33-13/SPEC.md
**Status:** concluído

## Rodadas de execução

### Rodada 0 — Investigação `__recovery/` (pode rodar em paralelo com Rodada 1)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 0 | Delphi (read-only) | `git log` + `git diff` entre `Repositório/Etiquetas/_ImpressaoEtiquetasPersonalizadas.pas` e `Repositório/Etiquetas/__recovery/_ImpressaoEtiquetasPersonalizadas.pas`. Reportar qual está mais recente, qual contém o fix do bugfix anterior, e qual é compilada de fato pelo `altis.dpr`. | `altis-delphi-agent` (modo análise) | pendente |

### Rodada 1 — Angular AltisW (lógica + UI em paralelo)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 1 | Angular lógica | Rename `zebraLinguagem`→`linguagemImpressao` em `etiqueta-personalizada.model.ts` (linha 13) e em `cadastro-etiquetas.component.ts` (linhas 1305, 1345, 1422 + 2 comentários). Adicionar opção `'A4'` no select de tipoImpressao. Adicionar handler em `tipoImpressao.valueChanges` que: quando A4 → `disable()` largura/altura/etiq/linha/DPI + `setValue` (21/29.7/1/96); quando ZPL/EPL → `enable()` + reset valores. Spec Jest cobrindo: rename, opção A4, disable/auto-fill, ZPL→A4→ZPL roundtrip. | `altis-angular-agent` | pendente |
| 2 | Angular UI | Adicionar `'A4'` no array de opções do `altis-input-select` (provavelmente em `etiqueta-designer.constants.ts` ou inline no template). Estados visuais para os 4 inputs quando desabilitados (Bootstrap 5 + tema dark/light). Garantir Mobile First responsivo. | `altis-bootstrap5-agent` | pendente |

### Rodada 2 — Spring Boot
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 3 | Spring Boot | Rename `zebraLinguagem`→`linguagemImpressao` em `EtiquetasPersonalizadasModel.java` (campo + getter/setter + `@ColunaAltis(nomeColunaOracle="LINGUAGEM_IMPRESSAO")`); `EtiquetasPersonalizadasModelDTO.java` (campo + getter/setter); `EtiquetasPersonalizadasService.java:78` (`setLinguagemImpressao`); `ZplLayoutValidador.java:26` (`getLinguagemImpressao`) + bypass quando `tipoImpressao = 'A4'`. `EtiquetasPersonalizadasService.converter` aceita `'A4'` retornando string vazia (sem chamar Zpl/EplConverter). JUnit cobrindo rename + aceitação de A4 + bypass do validador. | `altis-spring-agent` | pendente |

### Rodada 3 — Oracle
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 4 | Oracle DDL | Atualizar `Scripts de banco/Tabelas/Cadastros/ETIQUETAS_PERSONALIZADAS.sql`: (a) renomear coluna na declaração; (b) atualizar CHECK `CK_ETIQUETAS_PERS_TIPO_IMPRESSAO` para `in('ZPL','EPL','A4')` e atualizar comentário; (c) `LINGUAGEM_IMPRESSAO` deixa de ser `not null`. | `altis-oracle-agent` | pendente |
| 5 | Update.sql Delphi | Adicionar bloco em `_ComandosUpdateDB_Matheus.pas`: `ALTER TABLE ETIQUETAS_PERSONALIZADAS RENAME COLUMN ZEBRA_LINGUAGEM TO LINGUAGEM_IMPRESSAO`; `ALTER TABLE ETIQUETAS_PERSONALIZADAS MODIFY (LINGUAGEM_IMPRESSAO NULL)`; `ALTER TABLE ETIQUETAS_PERSONALIZADAS DROP CONSTRAINT CK_ETIQUETAS_PERS_TIPO_IMPRESSAO; ADD CONSTRAINT CK_ETIQUETAS_PERS_TIPO_IMPRESSAO CHECK (TIPO_IMPRESSAO IN ('ZPL','EPL','A4'))`. Registrar em `_ExecutaComandoUpdateDB.pas` na próxima versão de update. | `altis-oracle-agent` | pendente |

### Rodada 4 — Delphi (Piloto)
| # | Camada | O que fazer | Agente | Status |
|---|---|---|---|---|
| 6 | Delphi (cauteloso) | Aplicar rename `ZebraLinguagem`→`LinguagemImpressao` em `Banco/_EtiquetasPersonalizadas.pas` (record + parâmetro + INSERT linha 131 + AddColuna 156 + getString 180 + setString 247 + parâmetro pZebraLinguagem 49/204). Aplicar rename na cópia de `_ImpressaoEtiquetasPersonalizadas.pas` indicada pela investigação Rodada 0. Aplicar análise documentada de `EtiquetaEnderecoEstoqueA4.pas` no relatório (não modificar — só relatar como integrar no futuro). | `altis-delphi-agent` | pendente |

### Rodada 5 — Code review
| # | Tipo | O que validar | Agente | Status |
|---|---|---|---|---|
| 7 | Cross | Aderência a CLAUDE.md (raiz + monorepo + Piloto + Scripts de banco). Multi-empresa N/A (sem EMPRESA_ID). Mudança de assinatura de função pública coberta por todos os chamadores renomeados. Padrão Oracle 30 chars + lowercase reserved. Padrão Spring `@ColunaAltis`. Padrão Angular standalone + reactive forms. | `altis-code-reviewer-agent` | pendente |

## Arquivos criados/modificados

### Angular AltisW (8/8 testes Jest passam)
- **MOD** `Angular/AltisW/src/app/models/cadastros/etiqueta-personalizada.model.ts` — rename `zebraLinguagem` → `linguagemImpressao`
- **MOD** `Angular/AltisW/src/app/pages/cadastros/cadastro-etiquetas/etiqueta-designer.constants.ts` — `TipoImpressao` inclui `'A4'`; `TIPOS_IMPRESSAO_DISPONIVEIS = ['ZPL','EPL','A4']`; novas constantes `A4_LARGURA_CM/A4_ALTURA_CM/A4_RESOLUCAO_DPI/A4_ETIQUETAS_POR_LINHA`
- **MOD** `Angular/AltisW/src/app/pages/cadastros/cadastro-etiquetas/cadastro-etiquetas.component.ts` — rename + handler `sincronizarControlesA4()` (com **reset de defaults** ao voltar para ZPL/EPL após code review) + getter `ehTipoImpressaoA4`
- **MOD** `Angular/AltisW/src/app/pages/cadastros/cadastro-etiquetas/cadastro-etiquetas.component.html` — hint visual `*ngIf="ehTipoImpressaoA4"` informando valores fixos
- **MOD** `Angular/AltisW/src/app/pages/cadastros/cadastro-etiquetas/cadastro-etiquetas.component.css` — classe `.hint-a4` (CSS variables, dark/light compatível, Mobile First)
- **NOVO** `Angular/AltisW/src/app/pages/cadastros/cadastro-etiquetas/cadastro-etiquetas-tipo-a4.spec.ts` — 8 cenários Jest

### Spring Boot AltisClienteWs (10 testes JUnit criados — execução pendente sem Maven local)
- **MOD** `SpringBoot/AltisClienteWs/.../models/cadastros/EtiquetasPersonalizadasModel.java` — rename + `@ColunaAltis(nomeColunaOracle="LINGUAGEM_IMPRESSAO")`
- **MOD** `SpringBoot/AltisClienteWs/.../modelsDTOs/cadastros/EtiquetasPersonalizadasModelDTO.java` — rename + REMOVIDO `@AltisNaoPodeSerVazio` (coluna agora nullable)
- **MOD** `SpringBoot/AltisClienteWs/.../services/EtiquetasPersonalizadasService.java` — branch `if "A4".equals(tipo) → resultado=""` + `setLinguagemImpressao`
- **MOD** `SpringBoot/AltisClienteWs/.../helpers/ZplLayoutValidador.java` — bypass `if "A4".equals(tipoImpressao) return;` + `getLinguagemImpressao`
- **NOVO** `SpringBoot/AltisClienteWs/src/test/.../helpers/ZplLayoutValidadorTest.java` — 6 cenários
- **NOVO** `SpringBoot/AltisClienteWs/src/test/.../services/EtiquetasPersonalizadasServiceTest.java` — 4 cenários

### Oracle DDL + update.sql Delphi
- **MOD** `Scripts de banco/Tabelas/Cadastros/ETIQUETAS_PERSONALIZADAS.sql` — coluna `LINGUAGEM_IMPRESSAO clob` (nullable), constraint `CK_ETIQUETAS_PERS_TIPO_IMPRESS` (30 chars após code review) com `in('ZPL','EPL','A4')`, comentário atualizado
- **MOD** `Piloto/_ComandosUpdateDB_Matheus.pas` — 3 novas funções RecScript: rename column ZEBRA_LINGUAGEM→LINGUAGEM_IMPRESSAO, modify NULL, drop+add constraint nova com 30 chars
- **MOD** `Piloto/_ExecutaComandoUpdateDB.pas` — 3 novas linhas (versões Matheus 30, 31, 32)

### Delphi Piloto (8 pontos renomeados)
- **MOD** `Piloto/Banco/_EtiquetasPersonalizadas.pas` — 7 ocorrências (record, parâmetros, INSERT, AddColuna, getString, setString)
- **MOD** `Repositório/Etiquetas/__recovery/_ImpressaoEtiquetasPersonalizadas.pas:645` — cópia compilada pelo `altis.dpr`
- **MOD** `Repositório/Etiquetas/_ImpressaoEtiquetasPersonalizadas.pas:645` — cópia "viva" (paridade aplicada após code review para evitar landmine futuro)

### Total: **15 arquivos modificados + 3 novos** (180 inserções / 52 remoções)

## Resultado final

**Feature entregue.** Cross-stack rename completo de `ZEBRA_LINGUAGEM` → `LINGUAGEM_IMPRESSAO` (Oracle DDL + Delphi record/SQL + Spring Model/DTO + Angular model/form). Novo tipo `'A4'` aceito em todas as camadas: UI bloqueia 4 inputs e auto-preenche `21×29.7 cm / 96 DPI / 1 etiqueta-linha`; backend valida bypass para A4 (sem renderização — `LINGUAGEM_IMPRESSAO` fica NULL); geração propriamente dita do A4 (HTML/PDF a partir do `LAYOUT_JSON`) fica para feature futura.

### Code review final
**0 BLOQUEADOR · 6 ATENÇÃO** (4 resolvidas após decisões do usuário, 2 informativas pendentes de validação humana — `mvn test` local + auditoria de pontos de gravação que não passam por `ZplLayoutValidador.validar()`).

### Validações humanas pendentes
1. Compilar `altisTestes.dproj` no RAD Studio 12 + rodar `altisTestes.exe --exitbehavior:Continue` (orquestrador sem Delphi).
2. Rodar `mvnw test -Dtest=ZplLayoutValidadorTest,EtiquetasPersonalizadasServiceTest` em `SpringBoot/AltisClienteWs/` (orquestrador sem Maven com rede).
3. Aplicar update.sql no Oracle de produção em janela coordenada com redeploy SIMULTÂNEO de Spring `.jar` + Angular bundle + Piloto `.exe` (rename column quebra deploy não-atômico).
4. Auditar (manual) se TODOS os pontos de gravação de `EtiquetasPersonalizadasModel` passam por `ZplLayoutValidador.validar()` — a remoção do `@AltisNaoPodeSerVazio` no DTO permite gravação de ZPL com conteúdo vazio em rotas que não chamam o validador.
5. Visualmente conferir o hint `.hint-a4` em viewport mobile (360×640) e nos temas dark/light.

### Tickets de follow-up sugeridos
- **Implementar geração A4** (HTML/PDF a partir do `LAYOUT_JSON` Fabric.js). Caminho recomendado pela análise Delphi: backend gera PDF (Spring com iText/Flying Saucer/Thymeleaf) e Delphi abre no visualizador padrão.
- **Consolidar `__recovery/`** com a cópia "viva" de `_ImpressaoEtiquetasPersonalizadas.pas` em `Repositório/Etiquetas/`. Atualmente `altis.dpr:1519` linka apenas a `__recovery/` — anomalia única no monorepo. Esta feature aplicou rename em ambas para evitar landmine; consolidação completa (deletar `__recovery/` e ajustar `altis.dpr` + `altis.dproj`) fica para limpeza arquitetural.
- **Bug pré-existente em `ZplLayoutValidador`**: regex Java com `"\^FO..."`, `"\^FD..."`, `"\d+"` em string literal — escape inválido (`\^` → deveria ser `"\\^"`). Provavelmente nunca casou. Não introduzido por esta feature.
- **Bug pré-existente em `ETIQUETAS_PERSONALIZADAS.sql:134-140`**: `add column ROTINA_ID number(5);` é sintaxe inválida em Oracle e a coluna já existe. Bloco morto/refactor antigo.
- **Cobertura DUnitX para `Banco/_EtiquetasPersonalizadas.pas`** — não existe `TestEtiquetasPersonalizadas.pas` em `Piloto/Testes/`. Convenção do projeto pede teste para todo `Banco/_*.pas`.

### Pontos de impacto histórico (registros)
- Constraint `CK_ETIQUETAS_PERS_TIPO_IMPRESSAO` original tinha **32 chars** — fora do limite Oracle. Esta feature criou nome substituto correto `CK_ETIQUETAS_PERS_TIPO_IMPRESS` (30 chars) durante o ALTER. As funções históricas `criarTabelaETIQUETAS_PERSONALIZADAS` (v14) e `addConstraintCK_ETIQUETAS_PERS_TIPO_IMPRESSAO` (v23) foram preservadas intactas no `_ComandosUpdateDB_Matheus.pas` — não devem ser editadas (já rodaram em produção; alterá-las quebra a sequência de updates dos clientes).
