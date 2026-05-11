# BUGFIX SPEC — Código de barras comprimido em etiquetas personalizadas (EPL)

**Gerado em:** 2026-05-05 12:21:20
**Tipo:** bugfix
**Severidade:** P2
**Ambiente:** produção
**Status:** concluído

## Descrição do bug
Em etiquetas personalizadas, ao desenhar o elemento de código de barras ocupando a etiqueta inteira (largura grande), a impressão no modelo EPL gera o barcode comprimido — barras finas e estreitas, ignorando a largura visual definida no editor. Em ZPL o comportamento é correto. O usuário pediu para comparar com a rotina padrão de "Endereçamento de Estoque" (que monta o EPL via `_ImpressaoEtiquetasZebraEPL` + `_ImpressaoEtiquetas.AddBarEpl`) e replicar nas etiquetas personalizadas.

## Passos para reproduzir
1. Abrir o cadastro de etiquetas personalizadas no AltisW.
2. Criar layout com tipo de impressão **EPL** ou **EPL2**.
3. Adicionar elemento `barcode` (ex: Code 128) ocupando toda a largura da etiqueta.
4. Salvar e imprimir/visualizar preview.
5. Resultado: barcode aparece pequeno (módulo fixo ~2 dots), independente da largura desenhada.

## Comportamento esperado
A largura do módulo (`narrow`) e a barra larga (`wide`) do EPL devem ser proporcionais à largura do retângulo desenhado pelo usuário (em dots), considerando o número de módulos exigido pelo tipo do barcode (`Code 128`, `Interleaved 2 of 5`) e o tamanho do conteúdo — replicando a lógica já presente em `ZplConverterService.emitirBarcode()`.

## Comportamento atual
`EplConverterService.emitirBarcode()` ignora `wPx` (largura visual) e usa `narrow=2`, `wide=5` hardcoded. A altura usa `hPx` corretamente, por isso só a largura é afetada.

## Causa raiz
**Arquivo:** `Orientado a Objetos/SpringBoot/AltisClienteWs/src/main/java/com/altissistemas/clientews/api/helpers/EplConverterService.java`
**Função:** `emitirBarcode(JsonNode obj, int left, int top, double wPx, double hPx)`
**Linhas:** 323-324

```java
int narrow = Math.max(1, Math.min(10, 2));   // hardcoded — ignora wPx
int wide   = Math.max(2, Math.min(32, 5));   // hardcoded — ignora wPx
```

A função recebe `wPx` (largura disponível em px do editor) mas não a utiliza para dimensionar o módulo. Em contraste, `ZplConverterService.emitirBarcode()` (linhas 290-292) calcula o módulo corretamente:
```java
int largDots = px(wPx);
int totalMods = modulosBarcode(tipo, valor.length() > 0 ? valor.length() : 12);
int mw = Math.max(2, Math.min(10, round((double) largDots / totalMods)));
```

A função auxiliar `modulosBarcode(String tipo, int len)` em `ZplConverterService.java:315-321` calcula o número total de módulos de cada tipo de barcode (Code 128: `11*len + 35`, Interleaved 2 of 5: `9*len + 9`, EAN-13: 95).

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Spring Boot — `EplConverterService.emitirBarcode` | Bug primário — `narrow`/`wide` hardcoded | `altis-spring-agent` |
| Delphi — `_ImpressaoEtiquetasPersonalizadas.AddBarEpl` | Verificar se há chamadores reais (parece código morto: `Imprimir(pConteudoFinal)` recebe EPL pronto do backend) | `altis-delphi-agent` |
| Angular — `cadastro-etiquetas.component.ts` | Apenas validação do contrato (envia `width`/`scaleX` no JSON do layout) | `altis-angular-agent` |

**Não afetado:** `_ImpressaoEtiquetasZebraEPL.pas` + `_ImpressaoEtiquetas.AddBarEpl` (rotina de Endereçamento de Estoque) — usa `BarCodeNarrow`/`BarCodeWide` configuráveis via `EtiquetaModelo03.ini`. É a referência funcional citada pelo usuário.

## Testes TDD planejados
| Camada | Cenário de teste | Framework | Status |
|---|---|---|---|
| Spring Boot | Layout JSON com `barcode` Code 128, `width=400`, `scaleX=1` → EPL gerado deve ter `narrow >= 4` (proporcional, não fixo 2) | JUnit 5 + Mockito | pendente |
| Spring Boot | Layout JSON com `barcode` Interleaved 2 of 5, `width=300` → `narrow` calculado a partir de `largDots / modulosBarcode` | JUnit 5 + Mockito | pendente |
| Spring Boot | Cobertura: ramo onde `wPx` muito pequeno mantém `narrow >= 1` (clamp) | JUnit 5 | pendente |
| Delphi | Se `AddBarEpl` for chamado em runtime: DUnitX que valida narrow proporcional. Caso contrário: documentar como código morto | DUnitX | pendente |
| Angular | Spec verificando que payload enviado em `montarPayload()` contém `width` real do objeto barcode (Fabric.js) | Jasmine | pendente |

## Riscos de regressão
- **Baixo geral:** fix isolado em `emitirBarcode` do `EplConverterService`; outras funções (`emitirLinhaA`, `emitirRetangulo`, `emitirLogo`, `emitirLinha`) não são tocadas.
- **Atenção:** o cálculo de `narrow` deve ter clamp `[1,10]` (limite EPL) e `wide` deve ser >= 2 e geralmente `narrow*2`. Se `wPx` for muito pequeno, manter o módulo mínimo de 1.
- **EAN-13 já é bloqueado em EPL** por `ZplLayoutValidador` / `validarBarcodesParaImpressao`. Não exige tratamento adicional.

## Decisões tomadas
- Usuário aprovou prosseguir com TDD em todas as camadas (Spring Boot principal, Delphi e Angular para validação).
- A função auxiliar `modulosBarcode` deve ser **extraída para utilitário compartilhado** ou duplicada no `EplConverterService` — agente Spring decide o melhor caminho seguindo o padrão da skill.
- Nenhuma alteração no contrato HTTP entre Angular e Spring Boot.
- Nenhuma alteração no `_ImpressaoEtiquetasZebraEPL` (referência funcional intacta).
