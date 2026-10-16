# Sprint 1 — Primeira missão sem frustração

**Projeto:** INTERGALATIC — Além do Expediente  
**Data:** 16/10/2026  
**Base:** relatório de teste de jogabilidade de 16/10/2026.  
**Escopo realizado:** período de graça, missão Crachá Provisório, foco do canvas e retorno de menus, feedback de movimento/colisão, atualização da documentação e testes.  
**Não implementado nesta sprint:** histórico de recursos (Sprint 2), estimativa de viagem (Sprint 3), redesign do inventário e badge externo (Sprint 4).

## Racional e decisões arquiteturais

1. **Tutorial seguro:** `GameState.isGracePeriod` é `true` durante a missão de credenciamento. O tick e o custo temporal das duas ações do tutorial são ignorados enquanto ela está ativa; ao concluir a missão, volta a lógica normal de desgaste. A regra está em `core/logic.ts` e os parâmetros de movimento em `config/balance.ts`, não no Phaser.
2. **Compatibilidade:** mantivemos o ID `credencial` (em vez de introduzir `cracha_provisorio`), para que saves anteriores continuem carregando. O loader calcula a flag ausente para saves em portaria com missão pendente.
3. **Objetivo sempre inequívoco:** `objectiveProgress` deriva texto `Passo n/N` dos dados de `quests.json`. A interação com a recepção avança imediatamente para o balcão; retornos à recepção tornam-se instruções de flavor. O marcador de balcão ganha pulso enquanto for o objetivo.
4. **Input confiável:** o canvas recebe foco ao entrar na partida e após fechar modais, sem scroll; setas não deslocam o navegador durante o jogo. Cada cenário usa a decisão pura `obstructionFeedback` para evitar spam de "Caminho obstruído". Poeira é exclusivamente renderização Phaser.
5. **Correção estrutural adicional:** duas cenas de mundo podiam ficar ativas em paralelo, competindo por prompts e possivelmente executando `game.tick` duas vezes. `startWorldScene` interrompe a cena anterior antes de iniciar a próxima.

## Verificação

- [Vitest + TypeScript estrito + build — 89 testes, 10 arquivos aprovados](https://github.com/rogeriobeatz/itx-the-game/actions/runs/38960015072)
- [Playwright Chromium — 3 cenários desktop/mobile e fluxo real do crachá](https://github.com/rogeriobeatz/itx-the-game/actions/runs/38960015012)
- Vercel reportou deploy completo e bem-sucedido para a versão testada.
- O terceiro teste de navegador move o avatar por um *save de teste* até recepção e balcão e aciona **E** nas cenas reais. Ele valida persistência, estado `completed`, item de inventário, relógio e flag de tutorial. **Não substitui** o teste manual da caminhada completa.
- Pendente: teste físico iPhone/Android, feedback de poeira/halo em dispositivo real, migração de um save antigo real e observação com usuários desconhecidos.

## Invariantes preservadas

- Phaser importado dinamicamente no cliente; lógica pura fora de `scenes/`; renderização e input bruto em `OfficeScene` e `AnnexScene`.
- Estado armazenado em `store.ts` e lido pelo React por `useSyncExternalStore`.
- Dados da missão em JSON; regras do relógio em `core/logic.ts` e custos configurados via `BALANCE`.
- Elenco, assets e textos não introduzem nomes de pessoas reais.
- Commits acrescentados em `main` com avanço linear, sem rebase nem force push, para não quebrar a sincronização com Lovable.

## Arquivos completos desta entrega

O código integral fica no repositório. Não usar pedaços truncados ou trechos pseudocódigo para aplicar a alteração:

- `src/game/core/types.ts`
- `src/game/core/logic.ts`
- `src/game/core/store.ts`
- `src/game/core/interactions.ts`
- `src/game/core/movementFeedback.ts`
- `src/game/core/journey.test.ts`
- `src/game/core/movementFeedback.test.ts`
- `src/game/config/balance.ts`
- `src/game/data/quests.json`
- `src/game/data/floors.json`
- `src/game/scenes/OfficeScene.ts`
- `src/game/scenes/AnnexScene.ts`
- `src/game/GameRoot.tsx`
- `src/styles.css`
- `tests/browser/gameplay.spec.mjs`

Acompanhamento contínuo: [Sprint 1 Gameplay na planilha](https://docs.google.com/spreadsheets/d/18jLzWjctJ0Ec6T2TH_Our_AYzCmUJbD6R_VTM8_F8yE/edit).
