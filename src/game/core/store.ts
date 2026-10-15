import { BALANCE } from "../config/balance";
import { newPyramid, performPyramidAction, type PyramidAction } from "./pyramid";
import { applyEffects, isCollapsed, newGame, tickClock } from "./logic";
import { canVisit, arrivalPoint, FLOORS } from "./floors";
import type { Effects, GameState, FloorId } from "./types";

export type Modal = null | "title" | "dialogue" | "inventory" | "journal" | "pause" | "pitch" | "gameover" | "pyramid" | "ending" | "elevator" | "help";

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

const SAVE_KEY = "intergalatic-save-v1";
const LEGACY_SAVE_KEY = "intergalaxy-save-v1"; // Only for migrating existing player saves.

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
  if (snap.state.pyramid.outcome) {
    snap = { ...snap, ui: { ...snap.ui, modal: "ending", dialogue: null, watch: null } };
    return;
  }
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
  travelTo(id: FloorId): boolean {
    if (!canVisit(snap.state, id) || snap.state.pyramid.outcome) return false;
    const position = arrivalPoint(id);
    const moved = { ...snap.state, floor: id, pos: position,
      visitedFloors: snap.state.visitedFloors.includes(id) ? [...snap.state.visitedFloors] : [...snap.state.visitedFloors, id] };
    const { state, log } = tickClock(moved, 5);
    snap = { ...snap, state, ui: { ...snap.ui, modal: null, dialogue: null, prompt: null, watch: null,
      positions: { player: position, npcs: {} } } };
    log.forEach((msg) => game.toast(msg));
    checkCollapse();
    game.save();
    emit();
    return true;
  },
  pyramidAction(action: PyramidAction) {
    const result = performPyramidAction(snap.state, action);
    result.log.forEach((message) => game.toast(message));
    if (!result.ok) return;
    const advanced = result.minutes ? tickClock(result.state, result.minutes) : { state: result.state, log: [] as string[] };
    snap = { ...snap, state: advanced.state };
    advanced.log.forEach((message) => game.toast(message));
    checkCollapse();
    game.save();
    emit();
  },
  /** Called every frame by the world while the game is unpaused. */
  tick(sec: number) {
    if (snap.state.pyramid.outcome) return;
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
      return !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY));
    } catch {
      return false;
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
      if (!raw) return false;
      const base = newGame();
      const saved = JSON.parse(raw) as GameState;
      if (!saved || typeof saved !== "object" || !saved.stats || !saved.clock) return false;
      snap = {
        ...snap,
        state: { ...base, ...saved, floor: saved.floor && FLOORS.some((f) => f.id === saved.floor) ? saved.floor : "office",
          visitedFloors: Array.isArray(saved.visitedFloors) ? [...new Set(["office" as const, ...saved.visitedFloors.filter((id) => FLOORS.some((f) => f.id === id))])] : ["office"], pyramid: { ...newPyramid(), ...saved.pyramid }, quests: { ...base.quests, ...(saved.quests ?? {}) } },
      };
      game.save(); // migrate legacy save to the new title without losing progress
      emit();
      return true;
    } catch {
      return false;
    }
  },
  reset() {
    clockAcc = 0;
    saveAcc = 0;
    snap = { ...snap, state: newGame(), ui: { ...snap.ui, prompt: null, positions: { player: { ...BALANCE.startPos }, npcs: {} } } };
    game.save();
    emit();
  },
};
