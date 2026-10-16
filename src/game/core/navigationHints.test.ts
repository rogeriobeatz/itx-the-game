import { describe, expect, it } from "vitest";
import { interactionPoint, isometricDirection } from "./navigationHints";
import { startJourney } from "./logic";
describe("compass feedback", () => {
  it("points toward the first interactable in the lobby", () => {
    const s = startJourney("mulher");
    const target = interactionPoint(s,"security_check");
    expect(target).not.toBeNull();
    expect(isometricDirection(s.pos,target!)).toBe("↖");
  });
  it("resolves named narrative NPCs in the existing office", () => {
    const s = startJourney();
    s.floor = "office";
    expect(interactionPoint(s,"npc:patriarca")).toEqual({x:20.5,y:4.2});
  });
  it("indicates arrival and all compass quadrants", () => {
    expect(isometricDirection({x:1,y:1},{x:1,y:1})).toBe("◆");
    expect(isometricDirection({x:3,y:3},{x:4,y:2})).toBe("→");
    expect(isometricDirection({x:3,y:3},{x:2,y:4})).toBe("←");
    expect(isometricDirection({x:3,y:3},{x:4,y:4})).toBe("↓");
    expect(isometricDirection({x:3,y:3},{x:2,y:2})).toBe("↑");
  });
});
