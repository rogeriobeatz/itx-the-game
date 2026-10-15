import questsData from "../data/quests.json";
import { newPyramid, pyramidNewDay } from "./pyramid";
import itemsData from "../data/items.json";
import { BALANCE } from "../config/balance";
import type { Cond, Effects, GameState, ItemDef, QuestDef, QuestId, StatKey } from "./types";

export const QUESTS = questsData as QuestDef[];
export const ITEMS = itemsData as Record<string, ItemDef>;
export const questDef = (id: string) => QUESTS.find((q) => q.id === id);

const BOUNDED: StatKey[] = ["vida", "fe", "burnout", "reputacao"];
export const STAT_LABEL: Record<StatKey, string> = {
  vida: "Vida",
  fe: "Fé",
  burnout: "Burnout",
  reputacao: "Reputação",
  limpo: "R$ limpo",
  sujo: "R$ sujo",
};

export function newGame(): GameState {
  return {
    stats: { vida: 100, fe: 70, burnout: 10, reputacao: 20, limpo: 0, sujo: 0 },
    pyramid: newPyramid(),
    inventory: [],
    quests: Object.fromEntries(QUESTS.map((q) => [q.id, { status: "available" as const, step: 0 }])) as GameState["quests"],
    flags: {},
    clock: { day: 1, minutes: BALANCE.workStart },
    pos: { ...BALANCE.startPos },
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function clampStat(k: StatKey, v: number) {
  return BOUNDED.includes(k) ? Math.max(0, Math.min(100, v)) : Math.max(0, v);
}

export function isCollapsed(s: GameState) {
  return s.stats.vida <= 0 || s.stats.burnout >= 100;
}

function addStat(s: GameState, k: StatKey, v: number, log: string[]) {
  s.stats[k] = clampStat(k, s.stats[k] + v);
  log.push(`${v > 0 ? "+" : ""}${v} ${STAT_LABEL[k]}`);
}

function advanceClock(s: GameState, minutes: number, log: string[]) {
  const before = s.clock.minutes;
  const after = before + minutes;
  const drains = Math.floor(after / BALANCE.drainEvery) - Math.floor(before / BALANCE.drainEvery);
  if (drains > 0) {
    s.stats.fe = clampStat("fe", s.stats.fe - drains * BALANCE.feDrain);
    s.stats.burnout = clampStat("burnout", s.stats.burnout + drains * BALANCE.burnoutGain);
  }
  s.clock.minutes = after;
  if (after >= BALANCE.workEnd) {
    s.clock.day += 1;
    s.clock.minutes = BALANCE.workStart;
    s.stats.limpo += BALANCE.salary;
    s.stats.burnout = clampStat("burnout", s.stats.burnout - BALANCE.dayEndBurnoutRelief);
    log.push(`Fim do expediente! Salário: +${BALANCE.salary} R$ limpo`);
    pyramidNewDay(s, log);
  }
}

function mutate(s: GameState, e: Effects, log: string[]) {
  if (e.stats) for (const [k, v] of Object.entries(e.stats)) if (v) addStat(s, k as StatKey, v, log);
  for (const it of e.give ?? []) {
    s.inventory.push(it);
    log.push(`Recebeu: ${ITEMS[it]?.name ?? it}`);
  }
  for (const it of e.take ?? []) {
    const i = s.inventory.indexOf(it);
    if (i >= 0) s.inventory.splice(i, 1);
  }
  if (e.flag) s.flags[e.flag] = true;
  if (e.startQuest) {
    const q = s.quests[e.startQuest as QuestId];
    if (q && (q.status === "available" || q.status === "failed")) {
      q.status = "active";
      q.step = 0;
      log.push(`Missão iniciada: ${questDef(e.startQuest)?.title}`);
    }
  }
  for (const a of e.advance ?? []) {
    const def = questDef(a.quest);
    const q = s.quests[a.quest as QuestId];
    if (!def || !q || q.status !== "active") continue;
    if (def.objectives[q.step]?.id !== a.objective) continue;
    q.step += 1;
    if (q.step >= def.objectives.length) {
      q.status = "completed";
      log.push(`Missão concluída: ${def.title}`);
      mutate(s, def.rewards, log);
    }
  }
  if (e.minutes) advanceClock(s, e.minutes, log);
}

export function applyEffects(s0: GameState, e: Effects) {
  const state = clone(s0);
  const log: string[] = [];
  mutate(state, e, log);
  return { state, log };
}

export function tickClock(s0: GameState, minutes: number) {
  const state = clone(s0);
  const log: string[] = [];
  advanceClock(state, minutes, log);
  return { state, log };
}

export function failQuest(s0: GameState, id: string) {
  const state = clone(s0);
  const q = state.quests[id as QuestId];
  if (q?.status === "active") q.status = "failed";
  return state;
}

export function sickLeave(s0: GameState) {
  const s = clone(s0);
  s.stats.vida = BALANCE.sickLeave.vida;
  s.stats.burnout = BALANCE.sickLeave.burnout;
  s.stats.limpo = clampStat("limpo", s.stats.limpo - BALANCE.sickLeave.limpoPenalty);
  s.clock.day += 1;
  s.clock.minutes = BALANCE.workStart;
  s.pos = { ...BALANCE.startPos };
  if (s.quests.pitch?.status === "active") s.quests.pitch.status = "failed";
  return s;
}

export function currentObjective(s: GameState, questId: string) {
  const q = s.quests[questId as QuestId];
  const def = questDef(questId);
  if (!q || !def || q.status !== "active") return null;
  return def.objectives[q.step] ?? null;
}

export function checkCond(s: GameState, c?: Cond) {
  if (!c) return true;
  if (c.objective && currentObjective(s, c.objective[0])?.id !== c.objective[1]) return false;
  if (c.questStatus) {
    const [id, st] = c.questStatus;
    const list = Array.isArray(st) ? st : [st];
    const st2 = s.quests[id as QuestId]?.status;
    if (!st2 || !list.includes(st2)) return false;
  }
  if (c.hasItem && !s.inventory.includes(c.hasItem)) return false;
  if (c.flag && !s.flags[c.flag]) return false;
  if (c.notFlag && s.flags[c.notFlag]) return false;
  return true;
}

export function fmtClock(minutes: number) {
  const m = Math.floor(minutes);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
