# Auditoria profissional de jogabilidade — INTERGALATIC

**Data:** 16/10/2026  
**Escopo:** fluxo inicial, protagonista, controles touch/teclado, HUD, missões, descoberta de interações, elevador, progressão, estados de cena, acessibilidade, salvamento e testes.  
**Não incluídos como execução desta sprint:** recriação final de cenários, expansão de NPCs, novos andares, redesenho do roteiro inteiro.

## Sumário executivo

**Veredito: protótipo funcional, mas ainda não um RPG plenamente engajador.** A versão anterior tinha várias mecânicas independentes, sem um primeiro minuto coerente. Nota heurística inicial: **4/10** de jogabilidade (estimativa editorial baseada no código, capturas e feedback de jogo; não é uma pesquisa com jogadores). O retorno do usuário após testar no celular é considerado uma evidência de usabilidade, mas não equivale a telemetria quantitativa.

**Prioridade de produto:** o jogador deve conseguir: (1) escolher um avatar; (2) entender o primeiro objetivo; (3) mover-se sem lutar contra a interface; (4) interagir e receber feedback; (5) completar um objetivo; (6) descobrir o destino seguinte. Construir somente este ciclo com qualidade é mais valioso do que adicionar dez mapas adicionais.

## Método e níveis de evidência

1. **Leitura do repositório:** componentes React, Phaser, regras, diálogo, tarefas, HUD e animação.
2. **Testes unitários:** regras de progresso, quest, colisões, relógio, input analógico, protagonista e missão inicial.
3. **Smoke tests de navegador Chromium (Playwright):** título, escolha de avatar, tarefa inaugural, desktop, mobile em 390×844, ocultação de elementos desktop, joystick durante arrasto, menu e escolha de andar. Os testes foram executados via GitHub Actions com screenshots e artefatos.
4. **Revisão visual de capturas:** mobile inativo, mobile em movimento, elevador e tela desktop; encontrada quebra de rótulos nos andares e personagem pequeno na vertical. A fonte é uma captura automatizada, **não** uma partida presencial.
5. **Limitações:** não houve controle físico de iPhone/Android ou avaliação observacional com pessoas externas; não há FPS medido nem métricas de retenção. São pendências reais.

Referências de orientação:
- Apple HIG, Game Controls: https://developer.apple.com/design/human-interface-guidelines/game-controls
- Unity Learn, Mobile controls & touch input: https://learn.unity.com/tutorial/mobile-controls-and-touch-input
- GDC 2026, UX mobile porting: https://media.gdcvault.com/gdc2026/Slides/GDC_POPTLC_UX%2BMOBILE%2BPORTING%2BCHALLENGES_PDFVERSION.pdf

## Matriz de achados

| ID | Área | Severidade | Constatação | Situação após sprint |
| --- | --- | --- | --- | --- |
| AUD-01 | Mobile | P0 | Vários painéis de PC permaneciam visíveis na tela de jogo; gameplay ficava encoberto. | **Corrigido em código:** HUD compacto, detalhes recolhidos em menu. Captura Chromium confirma redução expressiva. |
| AUD-02 | Mobile | P0 | O joystick possuía uma base permanente e aceitava toque só numa caixa delimitada. | **Corrigido em código:** base só montada durante pressionamento; área touch ampla no lado esquerdo. Chromium validou aparecer/sumir. |
| AUD-03 | Mobile | P0 | AGIR, Andares, Itens e Missões ocupavam continuamente o rodapé. | **Corrigido em código:** AGIR contextual, botão do elevador e menu superior. |
| AUD-04 | Início | P0 | Não havia opção de homem ou mulher como protagonista. | **Corrigido em código:** escolha visual na abertura, sem mudar atributos, persistida no save. |
| AUD-05 | Início | P0 | Nova partida começava no escritório, sem tutorial ligado à primeira missão. | **Corrigido em código:** início na portaria, missão do crachá ativa e primeiro objetivo visível. |
| AUD-06 | Jornada | P0 | Após concluir o credenciamento, faltava indicação da próxima história. | **Corrigido em código:** indicação para o escritório e o fundador fictício. |
| AUD-07 | Elevador | P0 | Nove andares apareciam em uma lista longa, inclusive inacessíveis. | **Corrigido em código:** liberados primeiro, bloqueados recolhidos, botão da missão seguinte. |
| AUD-08 | Elevador | P1 | Rótulos longos ocupavam várias linhas na tela estreita. | **Corrigido em código:** códigos 0, 07, R, 11 e equivalentes, sujeitos à nova revisão visual. |
| AUD-09 | Navegação | P0 | A posição do objetivo podia não estar visível na câmera mobile. | **Corrigido parcialmente:** nova bússola de oito direções e objetivo textual; playtest manual pendente. |
| AUD-10 | Mundo | P0 | Cenas do Phaser reutilizavam arrays de marcadores/NPCs após reinicializações. | **Corrigido em código:** limpeza dos objetos temporários ao entrar na cena. |
| AUD-11 | Avatar | P1 | Reabrir a mesma cena poderia manter textura da partida anterior. | **Corrigido em código:** nova partida recria a cena e atualiza a textura. |
| AUD-12 | Câmera | P1 | Protagonista pequeno na vertical; cenografia vazia ocupa muito espaço. | **Ajuste parcial:** zoom para mobile aumentado, mas ambientação/câmera ainda demandam playtest. |
| AUD-13 | Feedback | P1 | Alertas em caixas grandes distraíam e se somavam ao objetivo. | **Ajuste parcial:** aviso inicial curto e toast menor no mobile. |
| AUD-14 | Progressão | P0 | Pode-se obter influência repetindo um pitch de menu; exploração vira opcional. | **Pendente:** transformar progressão em ações do mundo e missões com custo narrativo. |
| AUD-15 | Missões | P0 | Missões isoladas têm objetivos, mas poucas escolhas ou transformações no mundo. | **Pendente:** criar e validar uma campanha curta vertical, não acrescentar novas tarefas repetitivas. |
| AUD-16 | Interação | P1 | Interação por proximidade (E/AGIR), sem toque direto em objetos no mobile. | **Pendente:** avaliar toque contextual e priorização de alvos; proteger o joystick. |
| AUD-17 | Estado | P1 | Várias quests ativas podem competir por prioridade na navegação. | **Pendente:** missão rastreada selecionável pelo jogador. |
| AUD-18 | Feedback de progressão | P1 | Falta indicação de recompensa significativa ou mudança de estado após cada quest. | **Pendente:** resumo de ganho, desbloqueio e animação breve. |
| AUD-19 | Save | P1 | Save automático local existe, mas sem feedback e sem múltiplos slots. | **Pendente:** indicador de último save e teste de continuidade, priorizando compatibilidade. |
| AUD-20 | Desempenho | P1 | Atualizações frequentes de estado React/Phaser podem pressionar aparelhos simples. | **Não mensurado:** instrumentar frametime, long tasks e bateria em dispositivo real. |
| AUD-21 | Acessibilidade | P1 | Tipografia pixel, diálogos extensos e controles pequenos requerem avaliação. | **Pendente:** tamanhos mínimos, teclado/foco, contraste, redução de movimento. |
| AUD-22 | Game feel | P1 | Movimento e interações quase sem resposta audiovisual; ambiente parece apresentação técnica. | **Pendente:** passo, ação, reação de NPC, fade e transições breves. |
| AUD-23 | Design de sistemas | P1 | Burnout/Fé/R$/BTC/reputação coexistem sem consequências igualmente claras. | **Pendente:** mapa de causas/efeitos para cada atributo. |
| AUD-24 | QA | P0 | Antes havia testes de regras, mas não de jornada desktop/mobile em navegador. | **Corrigido em infraestrutura:** smoke Chromium + screenshots na Action; teste real de aparelhos ainda pendente. |

## Diagnóstico de raiz: falta um loop jogável

O fluxo atual coloca ações de RPG e medidores no mesmo plano, mas muitas tarefas são apenas interações de um clique que concedem recompensa. O jogo precisa que cada missão tenha **curiosidade → deslocamento → interação → decisão → consequência → novo destino**.

### Vertical slice de 10–15 minutos recomendado

| Etapa | Experiência de jogador | Critério de conclusão |
| --- | --- | --- |
| 1. Identidade | Escolher protagonista homem ou mulher | Duas opções visuais; controles acessíveis |
| 2. Primeiro dia | Chegar à portaria e reconhecer o espaço | Objetivo aparece sem tutorial longo |
| 3. Primeiro contato | Encontrar totem e crachá | Tarefa de duas etapas, feedback de conclusão |
| 4. Chamada do escritório | Sinalização e elevador deixam claro o destino | Jogador viaja sem procurar instruções fora do jogo |
| 5. Primeiro NPC | Conversa com personagem inteiramente fictício | Pelo menos duas respostas com efeitos compreensíveis |
| 6. Primeiro dilema | Decidir como executar uma entrega absurda | Consequência em tempo, risco, reputação ou Burnout |
| 7. Primeiro desbloqueio | A missão leva a um novo ambiente e de volta | Recompensa e motivo para continuar visíveis |

Os itens 1–4 já possuem implementação básica; 5–7 precisam ser aprofundados como gameplay, não apenas texto.

## Critérios de aceitação da próxima versão

- Uma pessoa sem instruções externas identifica o primeiro objetivo em **até 30 segundos** (meta, não medição atual).
- Consegue realizar a primeira interação em **até 90 segundos** e concluir o crachá em **até 4 minutos** (metas).
- Em 390×844 e 844×390, não há botões ou diálogos cortados; o mundo permanece prioritário.
- Joystick inativo não ocupa imagem; durante arrasto, pode ser ancorado na região tocada e solta ao levantar o dedo.
- Uma mão navega, a outra aciona interações quando próximas; nenhum gesto provoca rolagem da página.
- O elevador revela local atual, setor de missão, opções liberadas e requisitos de bloqueio, sem tela separada de instruções.
- Chegar, sair e retornar aos andares repetidamente não duplica NPCs nem marcadores.
- Finalizar e reiniciar mantém aparência escolhida ou permite uma nova seleção explicitamente.
- No mínimo **3 sessões observadas** com pessoas que não conhecem o jogo e testes em **iPhone Safari + Android Chrome** antes de classificar o mobile como concluído.
- Primeiro ciclo narrativo jogado integralmente do início até recompensa e próximo objetivo sem comandos de desenvolvedor.

## Decisão de roadmap

**Congelar temporariamente a expansão de andares e elenco.** Priorizar: (A) estabilidade e mobile; (B) jornada guiada portaria → escritório → primeiro NPC; (C) interação e decisões com consequência; (D) feedback e cenas de progresso; (E) balanceamento; (F) testes manuais assistidos e métricas locais. Só depois retomar novos mapas e quests. 

### Referências de código verificadas
- `src/game/GameRoot.tsx` — HUD, título, joystick, elevador, diálogos e menu.
- `src/game/core/logic.ts` — missões, estatísticas e início.
- `src/game/core/wayfinding.ts` e `navigationHints.ts` — guias de destino.
- `src/game/scenes/OfficeScene.ts` e `AnnexScene.ts` — movimento e reinicialização.
- `src/game/core/pyramid.ts` — promoção e economia de menu.
- `tests/browser/gameplay.spec.mjs` — roteiro automatizado desktop/mobile.
- `.github/workflows/browser-gameplay.yml` — Chromium e artefatos.
- `src/game/core/journey.test.ts` — início e avatar.
