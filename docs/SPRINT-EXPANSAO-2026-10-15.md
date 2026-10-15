# INTERGALAXY — Sprint de expansão de 15/10/2026

Sprint solicitada com pelo menos 30 entregas. O registro detalhado e editável contém **48 etapas técnicas distintas**, com IDs `SPR-001` a `SPR-048`, commits, validação e pendências. Fonte:
[Planilha — Sprint 30+](https://docs.google.com/spreadsheets/d/18jLzWjctJ0Ec6T2TH_Our_AYzCmUJbD6R_VTM8_F8yE/edit).

## Entregas agrupadas

- **SPR-001–SPR-010 — Mundo:** cinco anexos isométricos ficcionais (portaria, estúdio criativo, compliance, diretoria e tesouraria) e cenografia individual.
- **SPR-011–SPR-015 — Acessos:** bloqueios por patente, exceção de quest no auditório, registro de visitas, migração de saves e novos spawns.
- **SPR-016–SPR-020 — Missões:** Crachá Provisório, Campanha do Nada, A Planilha Infinita, Aprovação do Conselho e Porta do Último Saque.
- **SPR-021–SPR-026 — Interações:** crachá como item, totem/balcão, briefing/impressora, arquivo/risco, conselho/atas e cofre/terminal de BTC fictício.
- **SPR-027–SPR-031 — Navegação:** mapeamento de objetivos, sinalizadores em objetos, waypoint no minimapa, indicador de ambiente visitado e destaque de missão no elevador.
- **SPR-032–SPR-038 — Ajuda e interfaces:** manual interno, tutorial, controles de direção e ação no celular, confirmação antes do saque, exploração e diário de missões.
- **SPR-039–SPR-042 — Regras:** múltiplos dias com salário e pressão, avanço da falência no atestado, relógio encerrado nos finais e reset de acumuladores.
- **SPR-043–SPR-048 — QA:** teste de acessibilidade dos ambientes e missões, destinos, proteção do elenco fictício, correção da entrada do auditório e CI completo.

## Verificação

- Workflow GitHub Actions: [execução aprovada](https://github.com/rogeriobeatz/itx-the-game/actions/runs/38805944170) — Vitest, TypeScript e build de produção.
- [Deployment de produção](https://vercel.com/rogeriobeatz-1040s-projects/itx-the-game/51YSHEgBHSJySQdZGeAUk4zDaj1K) reportou sucesso.
- **Não realizados ainda:** playtest visual completo, validação de controles touch em aparelho real, auditoria dos retratos herdados e checagem de todos os fluxos por um jogador externo.
- O novo teste de colisão encontrou a entrada do auditório sobre o palco. A entrada foi corrigida, e os testes finais passaram.

## Regras permanentes

Esta obra é ficção e todos os BTC são simulados, sem transações. Personagens são arquétipos inventados; nenhuma pessoa real deve ser nomeada ou retratada de forma identificável. Novos mapas inspiram-se em imagens, mas não constituem uma reconstrução arquitetônica verificada. Evitar reescrever o histórico Git conectado ao Lovable.
