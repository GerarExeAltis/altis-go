# BUGFIX SPEC — Cobrir com teste o fix latente em _ImpressaoEtiquetas.pas:864 (Repositório/)

**Gerado em:** 2026-05-05 16:23:55
**Tipo:** bugfix (cobertura de regressão)
**Severidade:** P3 (bug latente já corrigido no working tree; falta apenas teste)
**Ambiente:** produção
**Status:** concluído

## Descrição do bug
Em `Orientado a Objetos\Repositório\Etiquetas\_ImpressaoEtiquetas.pas:864` (função `MontarEtiquetasLayout` em `TEtiqueta`), a chamada original era:

```pascal
_BibliotecaGenerica.LPad(NformatN(FDadosEtiquetas[i].EnderecoEstoqueId), 12, '0')
```

`NformatN` aplica formatação de milhar (ponto). Para `EnderecoEstoqueId = 1234` produzia `'1.234'`, que após `LPad(..., 12, '0')` virava `'0000001.234'` — string com ponto-de-milhar dentro do código de barras. Não é o esperado: barcode deve conter apenas dígitos zero-padded.

**Estado atual no working tree (não-stageado):** o fix já está aplicado por overstep do bugfix anterior:
```pascal
NFormatZeros(SFormatInt(FDadosEtiquetas[i].EnderecoEstoqueId), 12)
```
A mudança é correta. Falta apenas um teste DUnitX específico que cubra o comportamento desta linha — sem teste, qualquer reversão futura passa silenciosa.

## Passos para reproduzir (no estado anterior, antes do fix)
1. Imprimir uma etiqueta com layout que use endereço de estoque (`MontarEtiquetasLayout`) e `EnderecoEstoqueId` ≥ 1000.
2. Inspecionar o stream EPL/ZPL: barcode contém o ponto-de-milhar (ex: `'0000001.234'`).
3. Scanner pode rejeitar ou ler valor incorreto.

## Comportamento esperado
Barcode com 12 dígitos zero-padded sem ponto, sempre. Ex: `EnderecoEstoqueId=1234` → `'000000001234'`.

## Comportamento atual (working tree)
**Já correto** — `NFormatZeros(SFormatInt(...), 12)` produz `'000000001234'`. Este bugfix apenas adiciona um teste para travar o comportamento.

## Causa raiz
`NFormatN` é um helper de exibição (formato BR com ponto de milhar), não um helper de chave/identificador. Foi usado por engano em contexto onde se queria string-numérica pura. O `LPad(..., 12, '0')` mascarou o problema visualmente porque preencheu até 12 caracteres, mas não removeu o ponto inserido por `NformatN`.

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Delphi (testes) | Criar `Piloto/Testes/TestImpressaoEtiquetasEnderecoEstoqueLegacy.pas` (DUnitX) cobrindo a linha 864. **NÃO modificar** o `.pas` em `Repositório/` — fix já está lá. | `altis-delphi-agent` |
| Delphi (build de testes) | Registrar nova unit em `Piloto/Testes/altisTestes.dpr` | `altis-delphi-agent` |

**NÃO afetados:** Spring Boot, Angular, banco. Multi-empresa: N/A (sem queries SQL).

## Testes TDD planejados
| Camada | Cenário de teste | Framework | Status |
|---|---|---|---|
| Delphi | `EnderecoEstoqueId=1234` → barcode produzido = `'000000001234'` (sem ponto, length=12) | DUnitX | pendente |
| Delphi | `EnderecoEstoqueId=42` → `'000000000042'` | DUnitX | pendente |
| Delphi | `EnderecoEstoqueId=0` → `'000000000000'` | DUnitX | pendente |
| Delphi | `EnderecoEstoqueId=2147483647` (Int32 max) → `'002147483647'` | DUnitX | pendente |
| Delphi | Garantir que NÃO contém `.` (ponto-de-milhar do legado) | DUnitX | pendente |

## Riscos de regressão
- **Baixíssimo:** este bugfix só ADICIONA testes. Nenhum código de produção é tocado.
- **Atenção:** o teste deve invocar a mesma função `NFormatZeros(SFormatInt(id), 12)` (lógica idêntica à linha 864) — é um spec-test do helper, não dispara `MontarEtiquetasLayout` (que requer mock pesado de printer/banco).
- O teste serve como guarda contra reversão acidental do fix em `Repositório/`.

## Decisões tomadas
- Usuário aprovou: **manter fix do working tree e cobrir com teste** (sem reverter, sem refazer).
- Pre-flight obrigatório porque o fix tocado no bugfix anterior está em pasta sensível `Repositório/` (mesmo já aplicado, é importante mapear o blast radius para ter consciência de quais binários foram afetados).
- Sem fiscal-agent / integracoes-agent (sem impacto fiscal/integração).
