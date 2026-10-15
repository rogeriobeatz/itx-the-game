import { BALANCE } from "../config/balance";
import { applyEffects, isCollapsed, newGame, tickClock } from "./logic";
import type { Effects, GameState } from "./types";

export type Modal = null | "title" | "dialogue" | "inventory" | "journal" | "pause" | "pitch" | "gameover";

export interface UIState {
  modal: Modal;
  dialogue: { npc: string; node: string } | null;
  prompt: { id: string; label: string } | null;
  toasts: { id: number; text: string }[];
  watch: { elapsed: number } | null;
  positions: { player: { x: number; y: number }; npcs: Record<string, { x: number; y: number }> };
}

export interface Snapshot {
  state: GameState;
  ui: UIState;
}

const SAVE_KEY = "intergalaxy-save-v1";

let snap: Snapshot = {
  state: newGame(),
  ui: {
    modal: "title",
    dialogue: null,
    prompt: null,
    toasts: [],
    watch: null,
    positions: { player: { ...BALANCE.startPos }, npcs: {} },
  },
};
const listeners = new Set<() => void>();
let toastId = 0;
let clockAcc = 0;
let saveAcc = 0;

function emit() {
  for (const l of listeners) l();
}

function checkCollapse() {
  if (isCollapsed(snap.state) && snap.ui.modal !== "gameover" && snap.ui.modal !== "title") {
    snap = { ...snap, ui: { ...snap.ui, modal: "gameover", dialogue: null, watch: null } };
  }
}

export const game = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => snap,
  setUI(p: Partial<UIState>) {
    snap = { ...snap, ui: { ...snap.ui, ...p } };
    emit();
  },
  setState(s: GameState) {
    snap = { ...snap, state: s };
    checkCollapse();
    emit();
  },
  toast(text: string) {
    const id = ++toastId;
    snap = { ...snap, ui: { ...snap.ui, toasts: [...snap.ui.toasts.slice(-4), { id, text }] } };
    emit();
    setTimeout(() => {
      snap = { ...snap, ui: { ...snap.ui, toasts: snap.ui.toasts.filter((t) => t.id !== id) } };
      emit();
    }, 3600);
  },
  run(e: Effects) {
    const { state, log } = applyEffects(snap.state, e);
    snap = { ...snap, state };
    log.forEach((t) => game.toast(t));
    checkCollapse();
    game.save();
    emit();
  },
  /** Called every frame by the world while the game is unpaused. */
  tick(sec: number) {
    clockAcc += sec * BALANCE.minutesPerSecond;
    saveAcc += sec;
    if (clockAcc >= 1) {
      const whole = Math.floor(clockAcc);
      clockAcc -= whole;
      const { state, log } = tickClock(snap.state, whole);
      snap = { ...snap, state };
      log.forEach((t) => game.toast(t));
      checkCollapse();
      emit();
    }
    if (saveAcc >= BALANCE.autosaveSeconds) {
      saveAcc = 0;
      game.save();
    }
  },
  tickWatch(sec: number, near: boolean) {
    const w = snap.ui.watch;
    if (!w) return;
    if (!near) {
      game.setUI({ watch: null });
      game.toast("Você se afastou. Os peixes se sentiram desvalorizados.");
      return;
    }
    const elapsed = w.elapsed + sec;
    if (elapsed >= BALANCE.aquariumSeconds) {
      game.setUI({ watch: null });
      game.toast("Você atingiu a iluminação aquática.");
      game.run({ advance: [{ quest: "aquario", objective: "watch" }] });
      return;
    }
    if (Math.floor(elapsed * 4) !== Math.floor(w.elapsed * 4)) game.setUI({ watch: { elapsed } });
    else snap.ui.watch = { elapsed };
  },
  setPositions(p: UIState["positions"]) {
    snap = { ...snap, state: { ...snap.state, pos: p.player }, ui: { ...snap.ui, positions: p } };
    emit();
  },
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap.state));
    } catch {
      /* storage full or blocked */
    }
  },
  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const base = newGame();
      const saved = JSON.parse(raw) as GameState;
      snap = {
        ...snap,
        state: { ...base, ...saved, quests: { ...base.quests, ...saved.quests } },
      };
      emit();
      return true;
    } catch {
      return false;
    }
  },
  reset() {
    snap = { ...snap, state: newGame() };
    game.save();
    emit();
  },
};
