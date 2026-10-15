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
