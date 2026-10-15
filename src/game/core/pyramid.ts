import type { GameState, PyramidProgress } from "./types";
// SATIRA FICCIONAL: valores de BTC e fiscalizacao existem somente no jogo.
export type PyramidAction = "pitch" | "compliance" | "withdraw";
export const RANKS = [
  { name: "Estagiário", influence: 0 },
  { name: "Afiliado", influence: 24 },
  { name: "Ouro", influence: 57 },
  { name: "Diamante", influence: 99 },
  { name: "Soberano", influence: 150 },
  { name: "Faraó", influence: 210 },
] as const;
export const CRISIS_DAY = 4;
export const VICTORY_BTC = 0.7;
const cap = (v: number) => Math.max(0, Math.min(100, v));
const round = (v: number) => Math.round(v * 10000) / 10000;
export const newPyramid = (): PyramidProgress => ({
  rank: 0, influence: 0, heat: 8, instability: 5, btc: 0, withdrawn: 0, outcome: null,
});
export function rankForInfluence(n: number) {
  let result = 0;
  for (let i = 0; i < RANKS.length; i++) if (n >= RANKS[i]!.influence) result = i;
  return result;
}
export function eligibleRank(s: GameState): number {
  const unlocked = s.quests.bau?.status === "completed" && s.quests.pitch?.status === "completed";
  return Math.min(rankForInfluence(s.pyramid.influence), unlocked ? 5 : 4);
}
export function rewardQuestInfluence(s: GameState, id: string, log: string[]) {
  const rewards: Record<string, number> = { bau: 60, pitch: 45, aquario: 30, refeicao: 12, louvor: 25, respiro: 20 };
  const amount = rewards[id] ?? 0;
  if (!amount || s.pyramid.outcome) return;
  const oldRank = s.pyramid.rank;
  s.pyramid.influence += amount;
  s.pyramid.rank = eligibleRank(s);
  log.push("Missão concluída: +" + amount + " influência na hierarquia!");
  if (s.pyramid.rank > oldRank) log.push("PROMOÇÃO: " + RANKS[s.pyramid.rank]!.name.toUpperCase() + "!");
}
export function checkPyramidCrisis(s: GameState, log: string[]) {
  const p = s.pyramid;
  if (p.outcome) return;
  if (p.heat >= 100) {
    p.outcome = "raided";
    log.push("OPERAÇÃO FICTÍCIA! A fiscalização chegou antes do saque.");
  } else if (p.instability >= 100 || s.clock.day >= CRISIS_DAY) {
    p.outcome = "bankrupt";
    log.push("FALÊNCIA! Seus bitcoins não sacados viraram poeira cósmica.");
  }
}
export function pyramidNewDay(s: GameState, log: string[]) {
  if (s.pyramid.outcome) return;
  s.pyramid.heat = cap(s.pyramid.heat + 8);
  s.pyramid.instability = cap(s.pyramid.instability + 16);
  checkPyramidCrisis(s, log);
}
export function performPyramidAction(old: GameState, action: PyramidAction) {
  const s: GameState = { ...old, stats: { ...old.stats }, pyramid: { ...old.pyramid } };
  const p = s.pyramid;
  const log: string[] = [];
  if (p.outcome) return { state: old, log: ["A partida já terminou."], minutes: 0, ok: false };
  let minutes = 0;
  if (action === "pitch") {
    const before = p.rank;
    const influence = 24 + before * 9;
    const earned = round(0.09 + before * 0.05);
    p.influence += influence;
    p.btc = round(p.btc + earned);
    p.heat = cap(p.heat + 12 + before * 3);
    p.instability = cap(p.instability + 6 + before * 2);
    s.stats.burnout = cap(s.stats.burnout + 7);
    s.stats.fe = cap(s.stats.fe - 3);
    p.rank = eligibleRank(s);
    minutes = 45;
    log.push("Pitch: +" + influence + " influência e +" + earned.toFixed(4) + " BTC fictícios.");
    if (p.rank > before) log.push("PROMOÇÃO: " + RANKS[p.rank]!.name.toUpperCase() + "!");
  } else if (action === "compliance") {
    if (s.stats.limpo < 40)
      return { state: old, log: ["Precisa de R$ 40 limpos. Trabalhe nos computadores."], minutes: 0, ok: false };
    s.stats.limpo -= 40;
    s.stats.burnout = cap(s.stats.burnout + 4);
    p.heat = cap(p.heat - 22);
    p.instability = cap(p.instability + 7);
    minutes = 30;
    log.push("Reunião de compliance de faz de conta: atenção da PF -22; falência +7.");
  } else {
    if (p.btc <= 0) return { state: old, log: ["Você não tem BTC para sacar."], minutes: 0, ok: false };
    p.withdrawn = round(p.withdrawn + p.btc);
    p.btc = 0;
    p.outcome = p.rank === 5 && p.withdrawn >= VICTORY_BTC ? "farao" : "early_exit";
    log.push(p.outcome === "farao" ? "FINAL FARAÓ: saque antes do colapso!" : "FINAL: saque antecipado.");
  }
  checkPyramidCrisis(s, log);
  return { state: s, log, minutes, ok: true };
}
