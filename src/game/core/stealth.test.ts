import { describe, expect, it } from "vitest";
import { PATROLS, STEALTH, exposure, isHidden, routeIsWalkable, stepMeter } from "./stealth";

const w = { x: 0, y: 0, facing: 0 };
const blockers = [] as never[];
void blockers;

describe("stealth", () => {
  it("sees a player straight ahead within range", () => {
    expect(exposure(w, 3, 0, { hidden: false, running: false })).toBeGreaterThan(0);
  });
  it("does not see behind or beyond range", () => {
    expect(exposure(w, -2, 0, { hidden: false, running: false })).toBe(0);
    expect(exposure(w, STEALTH.viewRange + 1, 0, { hidden: false, running: false })).toBe(0);
  });
  it("hidden players are never seen", () => {
    expect(exposure(w, 2, 0, { hidden: true, running: false })).toBe(0);
  });
  it("running makes noise even behind the watcher", () => {
    expect(exposure(w, -2, 0, { hidden: false, running: true })).toBeGreaterThan(0);
  });
  it("hiding only works when standing still next to cover", () => {
    const cover = [{ x: 5, y: 5, w: 1, d: 1 }];
    expect(isHidden(6.5, 5.5, false, cover)).toBe(true);
    expect(isHidden(6.5, 5.5, true, cover)).toBe(false);
    expect(isHidden(9, 9, false, cover)).toBe(false);
  });
  it("meter fills to a catch and resets", () => {
    let m = 0, caught = false;
    for (let i = 0; i < 100 && !caught; i++) ({ meter: m, caught } = stepMeter(m, 1, 0.1));
    expect(caught).toBe(true);
    expect(m).toBe(0);
    expect(stepMeter(50, 0, 1).meter).toBe(50 - STEALTH.decayPerSec);
  });
  it("every patrol route avoids furniture", () => {
    for (const p of PATROLS) expect(routeIsWalkable(p.route), p.id).toBe(true);
  });
});
