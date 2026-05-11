# BUGFIX SPEC — Largura/altura não persistem ao carregar etiqueta existente

**Gerado em:** 2026-05-06 10:49:27
**Tipo:** bugfix (regressão de bugfix anterior)
**Severidade:** P1
**Ambiente:** desenvolvimento → produção
**Status:** concluído

## Descrição do bug
Ao carregar uma etiqueta personalizada existente (ZPL ou EPL com dimensões custom, ex: 15×8 cm), os campos `larguraCm` e `alturaCm` (e também `etiquetasPorLinha`, `resolucaoDpi`) são sobrescritos pelos valores padrão (10×5, 1, 203) imediatamente após o carregamento — perdendo os valores salvos no banco.

## Passos para reproduzir
1. Cadastrar uma etiqueta personalizada com `tipoImpressao=ZPL`, `larguraCm=15`, `alturaCm=8`. Salvar.
2. Sair da tela e reabrir o cadastro selecionando a etiqueta criada.
3. **Resultado:** form mostra `larguraCm=10`, `alturaCm=5` (defaults `DIMENSOES_PADRAO`).
4. **Esperado:** form mostra os valores salvos (15×8).

## Comportamento esperado
- Carregar etiqueta existente preserva `larguraCm`, `alturaCm`, `etiquetasPorLinha`, `resolucaoDpi` conforme salvo.
- Reset para defaults só ocorre quando o usuário **muda manualmente** o `tipoImpressao` de `'A4'` para `'ZPL'`/`'EPL'` (intenção do bugfix `2026-05-05-15-15-54`).

## Comportamento atual
`sincronizarControlesA4()` else branch sobrescreve incondicionalmente os 4 controls com defaults sempre que `tipoImpressao !== 'A4'`. Como o método é chamado em `montarDado` (linha 1548) — que é o callback após `super.montarDado(dados)` carregar dados do backend — sobrescreve os valores recém-carregados.

## Causa raiz
**Arquivo:** `Orientado a Objetos\Angular\AltisW\src\app\pages\cadastros\cadastro-etiquetas\cadastro-etiquetas.component.ts:289-297`

```typescript
} else {
    controlesA4.forEach(ctrl => {
        this.formulario.get(ctrl)?.enable({ emitEvent: false });
    });
    // ↓ ESTAS 4 LINHAS são executadas SEMPRE que tipo !== 'A4',
    //   inclusive ao carregar dados do backend.
    this.formulario.get('larguraCm')?.setValue(DIMENSOES_PADRAO.largura, { emitEvent: false });
    this.formulario.get('alturaCm')?.setValue(DIMENSOES_PADRAO.altura, { emitEvent: false });
    this.formulario.get('etiquetasPorLinha')?.setValue(1, { emitEvent: false });
    this.formulario.get('resolucaoDpi')?.setValue(String(RESOLUCAO_DPI_PADRAO), { emitEvent: false });
}
```

Falta distinguir **transição** de `'A4'` para outro tipo (intencional — restaurar defaults) de **chamada de inicialização/carregamento** (não-intencional — preservar valores).

## Camadas afetadas
| Camada | Impacto | Agente |
|---|---|---|
| Angular AltisW | Único arquivo: `cadastro-etiquetas.component.ts` (rastrear `previousTipoImpressao` para condicionar o reset) + spec | `altis-angular-agent` |
| Code Review | Sempre | `altis-code-reviewer-agent` |

## Testes TDD planejados
| # | Camada | Cenário | Framework | Status |
|---|---|---|---|---|
| 1 | Angular | Carregar dados com `tipoImpressao='ZPL'`, `larguraCm=15`, `alturaCm=8` → após `sincronizarControlesA4()`, valores preservados (NÃO resetados) | Jest | pendente |
| 2 | Angular | Iniciar form em `'ZPL'` → mudar para `'A4'` → mudar para `'ZPL'` → defaults restaurados (10×5/1/203) — preserva o feature original | Jest | pendente |
| 3 | Angular | Iniciar form em `'ZPL'` → manter em `'ZPL'` → valores não mudam (idempotência) | Jest | pendente |
| 4 | Angular | Iniciar form em `'EPL'` → mudar para `'A4'` → 21×29.7/1/96 + disable (preservado) | Jest | pendente |
| 5 | Angular | A4 → A4 (ex: chamada após carregar etiqueta A4 existente) → mantém 21×29.7 e disable | Jest | pendente |

## Riscos de regressão
- **Baixo geral:** mudança isolada no método `sincronizarControlesA4`. O comportamento de A4 (setValue + disable) preservado.
- **Atenção:** os specs do `cadastro-etiquetas-ux-fixes.spec.ts` que testam o else branch precisam ser atualizados — os asserts atuais validam que os valores são resetados em ZPL/EPL; após o fix, isso só vale para a transição A4→ZPL.

## Decisões tomadas
1. **Estratégia:** rastrear `previousTipoImpressao` (campo private) e resetar valores APENAS quando há transição `'A4' → não-'A4'`. Carregamento de dados existentes preserva valores.
2. **Pre-flight dispensado:** P1 mas isolado em UM componente Angular sem SQL/banco/integração.
