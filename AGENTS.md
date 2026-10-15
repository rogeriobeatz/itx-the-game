<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- The game lives in `src/game/`: Phaser only renders/moves the world (`scenes/`), all rules live in pure `core/logic.ts` tuned by `config/balance.ts` — keeps rules testable and in one place.
- Content (quests, dialogues, characters, items, map, pitch) is JSON in `src/game/data/`; add new content there instead of code — systems stay generic.
- React draws the HUD/dialogue overlays from `core/store.ts` (useSyncExternalStore); Phaser is dynamically imported client-side only — it breaks SSR if imported statically.
- Art is swapped through `src/game/assets.ts`; character sprites are procedurally drawn placeholders in OfficeScene.

## Rules for every development sprint
- **Privacy:** Never use real people's names, surnames, recognizable nicknames, identifiable portraits, or allegations about individuals anywhere in the game, artwork, comments, documentation, or trackers. Approved fictional cast and safeguards live in [docs/PRIVACIDADE_E_PERSONAGENS.md](docs/PRIVACIDADE_E_PERSONAGENS.md) and `src/game/core/privacy.test.ts`.
- **Source of truth:** Keep the [living development tracker](https://docs.google.com/spreadsheets/d/18jLzWjctJ0Ec6T2TH_Our_AYzCmUJbD6R_VTM8_F8yE/edit) updated for every feature, fix and commit, distinguishing code/CI success from manual UI verification.
- **Levels:** Additional floors are intentional fictionalized interpretations of photographs, **not** an asserted real floor plan. Keep floors in `src/game/data/floors.json`, quests in `src/game/data/quests.json`, and objective locations in `src/game/core/wayfinding.ts`.
- **Before merging:** run tests, TypeScript and build; ensure floor entrance tiles and interactable targets remain accessible; preserve save compatibility and mobile controls.
