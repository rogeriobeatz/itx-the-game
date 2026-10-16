import { describe, expect, it } from "vitest";
import { applyEffects, newGame, objectiveProgress, startJourney, tickClock } from "./logic";
import { BALANCE } from "../config/balance";
import { canVisit, arrivalPoint } from "./floors";
describe("RPG onboarding", () => {
  it("starts in the lobby with a specific first objective", () => {
    const s = startJourney("mulher");
    expect(s.avatar).toBe("mulher");
    expect(s.floor).toBe("portaria");
    expect(s.pos).toEqual(arrivalPoint("portaria"));
    expect(s.visitedFloors).toEqual(["portaria"]);
    expect(s.quests.credencial.status).toBe("active");
    expect(canVisit(s,"office")).toBe(true);
  });
  it("does not link stats or ranking to avatar appearance", () => {
    expect(startJourney("homem").stats).toEqual(startJourney("mulher").stats);
    expect(startJourney("homem").pyramid).toEqual(startJourney("mulher").pyramid);
  });
  it("keeps legacy newGame defaults stable", () => {
    expect(newGame().floor).toBe("office");
    expect(newGame().avatar).toBe("homem");
  });
});

describe("first mission continuity", () => {
  it("guides the player from the lobby to the next narrative quest", async () => {
    const { applyEffects } = await import("./logic");
    const { navigationTarget } = await import("./wayfinding");
    let s = startJourney("homem");
    expect(navigationTarget(s)?.floor).toBe("portaria");
    s = applyEffects(s, {advance:[{quest:"credencial",objective:"register"}]}).state;
    s = applyEffects(s, {advance:[{quest:"credencial",objective:"badge"}]}).state;
    expect(s.quests.credencial.status).toBe("completed");
    expect(navigationTarget(s)?.floor).toBe("office");
    expect(navigationTarget(s)?.interaction).toBe("npc:patriarca");
  });
});

describe("tutorial sem punição (Sprint 1)", () => {
  it("mantém o relógio e o desgaste congelados durante deslocamento e teste de comandos", () => {
    const s = startJourney("mulher");
    expect(s.isGracePeriod).toBe(true);
    const r = tickClock(s, 600);
    expect(r.state.clock).toEqual(s.clock);
    expect(r.state.stats).toEqual(s.stats);
  });

  it("muda o objetivo imediatamente ao registrar a recepção", () => {
    const initial = startJourney("homem");
    expect(objectiveProgress(initial, "credencial")).toContain("Passo 1/2");
    const progress = applyEffects(initial, { advance: [{ quest: "credencial", objective: "register" }], minutes: 5 });
    expect(progress.state.quests.credencial.step).toBe(1);
    expect(objectiveProgress(progress.state, "credencial")).toBe("Passo 2/2: Retire o crachá no balcão de segurança");
    expect(progress.state.clock).toEqual(initial.clock);
    expect(progress.state.isGracePeriod).toBe(true);
    expect(progress.log.join(" ")).toContain("Passo 2/2");
  });

  it("libera o relógio somente depois do crachá, sem cobrar a interação final", () => {
    let s = startJourney("mulher");
    s = applyEffects(s, { advance: [{ quest: "credencial", objective: "register" }], minutes: 5 }).state;
    s = applyEffects(s, { advance: [{ quest: "credencial", objective: "badge" }], minutes: 3 }).state;
    expect(s.quests.credencial.status).toBe("completed");
    expect(s.isGracePeriod).toBe(false);
    expect(s.clock.minutes).toBe(BALANCE.workStart);
    expect(s.stats.fe).toBe(70);
    expect(s.stats.burnout).toBe(10);
    const after = tickClock(s, 20).state;
    expect(after.clock.minutes).toBe(BALANCE.workStart + 20);
    expect(after.stats.fe).toBe(68);
    expect(after.stats.burnout).toBe(12);
  });

  it("ignora a tentativa de repetir o primeiro passo depois de concluído", () => {
    const s = applyEffects(startJourney(), {advance: [{quest:"credencial",objective:"register"}]}).state;
    const repeated = applyEffects(s, {advance: [{quest:"credencial",objective:"register"}]});
    expect(repeated.state.quests.credencial.step).toBe(1);
    expect(repeated.log).toEqual([]);
  });
});
