import { describe, expect, it } from "vitest";
import { applyEffects, isCollapsed, newGame, sickLeave, tickClock } from "./logic";
import { blocked } from "./world";
import { RANKS, performPyramidAction, rewardQuestInfluence } from "./pyramid";

describe("stat rules", () => {
  it("clamps bounded stats between 0 and 100", () => {
    const { state } = applyEffects(newGame(), { stats: { fe: 500, vida: -500 } });
    expect(state.stats.fe).toBe(100);
    expect(state.stats.vida).toBe(0);
  });

  it("collapses when burnout reaches 100", () => {
    const { state } = applyEffects(newGame(), { stats: { burnout: 90 } });
    expect(state.stats.burnout).toBe(100);
    expect(isCollapsed(state)).toBe(true);
  });

  it("drains 1 Fé and adds 1 Burnout every 10 game minutes", () => {
    const s = newGame();
    const { state } = tickClock(s, 30);
    expect(state.stats.fe).toBe(s.stats.fe - 3);
    expect(state.stats.burnout).toBe(s.stats.burnout + 3);
  });

  it("pays 150 salary when the workday ends at 18:00", () => {
    const { state } = tickClock(newGame(), 9 * 60);
    expect(state.clock.day).toBe(2);
    expect(state.stats.limpo).toBe(150);
  });

  it("sick leave resets burnout to 35 and fails the pitch", () => {
    let s = applyEffects(newGame(), { startQuest: "pitch", stats: { burnout: 100 } }).state;
    s = sickLeave(s);
    expect(s.stats.burnout).toBe(35);
    expect(s.quests.pitch.status).toBe("failed");
  });
});

describe("O Baú Roxo", () => {
  it("only advances objectives in order and pays rewards at the end", () => {
    let s = applyEffects(newGame(), { startQuest: "bau" }).state;
    s = applyEffects(s, { advance: [{ quest: "bau", objective: "culto" }] }).state;
    expect(s.quests.bau.step).toBe(0);
    for (const o of ["talk_founder", "get_chest", "deliver_elevator", "culto", "return_founder"]) {
      s = applyEffects(s, { advance: [{ quest: "bau", objective: o }] }).state;
    }
    expect(s.quests.bau.status).toBe("completed");
    expect(s.stats.limpo).toBe(500);
    expect(s.stats.sujo).toBe(300);
  });
});

describe("collision", () => {
  it("blocks inside a rect and at the map edge", () => {
    const rects = [{ x: 2, y: 2, w: 1, d: 1 }];
    expect(blocked(2.5, 2.5, rects)).toBe(true);
    expect(blocked(5, 5, rects)).toBe(false);
    expect(blocked(0.1, 5, rects)).toBe(true);
  });
});

describe("pirâmide fictícia", () => {
  it("permite subir até Faraó com controle do risco", () => {
    let s = newGame();
    s.stats.limpo = 100;
    s.quests.bau.status = "completed";
    s.quests.pitch.status = "completed";
    for (let i = 0; i < 5; i++) s = performPyramidAction(s, "pitch").state;
    expect(RANKS[s.pyramid.rank]!.name).toBe("Faraó");
    expect(s.pyramid.outcome).toBeNull();
    s = performPyramidAction(s, "withdraw").state;
    expect(s.pyramid.outcome).toBe("farao");
  });
  it("permite o final Faraó com saque", () => {
    const s = newGame();
    s.pyramid.rank = 5;
    s.pyramid.btc = 1;
    const result = performPyramidAction(s, "withdraw");
    expect(result.state.pyramid.outcome).toBe("farao");
    expect(result.state.pyramid.withdrawn).toBe(1);
  });
  it("distingue saída antecipada e carteira vazia", () => {
    const s = newGame();
    expect(performPyramidAction(s, "withdraw").ok).toBe(false);
    s.pyramid.btc = 0.2;
    expect(performPyramidAction(s, "withdraw").state.pyramid.outcome).toBe("early_exit");
  });
  it("a fiscalização fictícia pode interromper a ascensão", () => {
    const s = newGame();
    s.pyramid.heat = 95;
    expect(performPyramidAction(s, "pitch").state.pyramid.outcome).toBe("raided");
  });
});

describe("progresso narrativo", () => {
  it("sem as duas missões principais não libera o nível Faraó", () => {
    let s = newGame();
    s.stats.limpo = 100;
    for (let i = 0; i < 5; i++) s = performPyramidAction(s, "pitch").state;
    expect(s.pyramid.rank).toBe(4);
  });
  it("missões concedem influência e destravam Faraó", () => {
    const s = newGame();
    s.pyramid.influence = 210;
    s.pyramid.rank = 4;
    s.quests.bau.status = "completed";
    s.quests.pitch.status = "completed";
    rewardQuestInfluence(s, "pitch", []);
    expect(s.pyramid.rank).toBe(5);
    expect(s.pyramid.influence).toBe(255);
  });
});
