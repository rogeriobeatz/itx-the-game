import { describe, expect, it } from "vitest";
import { newGame, startJourney } from "./logic";
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
