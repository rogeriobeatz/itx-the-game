# INTERGALATIC — Além do Expediente (vertical slice)

A playable 2D isometric pixel-art RPG that opens straight into the game. All text in Portuguese (BR), satirical tone.

## What the player gets

1. **Title screen** — Intergalatic logo, purple/black/magenta neon, "Jogar" and "Continuar" (if a save exists) and "Novo jogo".
2. **Main office map** (built from separate tiles and objects, not one picture): reception, workstations with PCs and gamer chairs, collectible figures, luxury aquarium, rest area with sofas, decorative staircase + mezzanine, elevator (private), meeting room, columns and industrial lights.
3. **Controls** — WASD/arrows to walk, E to interact, I inventory, J mission journal, Esc pause. Collisions with walls, furniture and NPCs; correct depth sorting so the player walks behind/in front of objects.
4. **NPCs** — O Patriarca (founder), Diretor Carimbo (Caneta Forte), Funcionário Fantasma (CLT survival), Profeta KPI (coach). Each has idle wandering/behaviour and branching dialogue with choices that change stats.
5. **Stats** — Vida, Fé, Burnout, Reputação (0–100), Dinheiro Limpo, Dinheiro Sujo. Fé drains and Burnout rises slowly with the in-game clock. Burnout 100 or Vida 0 → "Afastamento" game-over screen with restart from last save.
6. **Clock** — workday 09:00–18:00 that runs in accelerated time; day counter.
7. **Missions**
   - **O Baú Roxo**: talk to Patriarca → receive chest (inventory) → carry to private elevator → attend Profeta KPI's "culto motivacional" to restore Fé → return to Patriarca for reward (clean + dirty money, reputation).
   - **Contemplação Premium**: stand at the aquarium watching fish for 60 seconds (progress bar, cancels if you walk away) → less Burnout, more Fé.
   - **O Pitch Infinito**: meeting-room presentation mini-event: slides of absurd marketing jargon, each requiring a quick choice; wrong choices raise Burnout; survive without hitting 100 → Reputação up.
8. **HUD** — top-left Vida/Fé/Burnout bars; top-right wallets, reputation, day/time; bottom-left current mission + objectives; bottom-right minimap. Dialogue box with pixel portrait, name, text, choices.
9. **Saving** — progress (stats, inventory, mission states, position, clock) saved locally in the browser automatically and on key events.

## Visual direction

Pixel art, dark purple/black base with magenta and neon highlights; pixel font (Press Start 2P for titles, VT323 for body). Placeholder sprites generated for characters, portraits and furniture, kept in a single asset manifest so they can be swapped later.

## Technical details

- Install `phaser` (v3). Game mounted in `src/routes/index.tsx` via a client-only component that dynamically imports Phaser (avoids SSR breakage).
- Structure under `src/game/`:
  - `scenes/` — BootScene (load), TitleScene, OfficeScene (world), UIScene (HUD/minimap overlay), DialogueScene, PitchScene.
  - `systems/` — StatsSystem (centralized rules in `config/balance.ts`), QuestSystem (states available/active/completed/failed, objective conditions, rewards), DialogueSystem (node graph with choices + effects), InventorySystem, ClockSystem, SaveSystem (localStorage, versioned).
  - `data/*.json` — characters, quests, dialogues, map layout (tile grid + object placements + interactables).
  - `iso/` — grid↔screen conversion, depth sort by y, collision grid.
  - `assets/` — generated placeholder images + manifest.
- An event bus connects systems to UI scenes, so new NPCs/maps/quests are data-only additions.
- No auth, database, payments or multiplayer.
- Unit tests for stat rules (clamping, burnout game-over) and quest progression.
- Note: this project's framework publishes to Lovable hosting (Cloudflare-style edge), not Vercel; the game runs entirely in the browser so it publishes fine here.
- Record architecture rules in `AGENTS.md`.
