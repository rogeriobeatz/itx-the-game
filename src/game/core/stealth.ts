import { SOLIDS, MAP, type Rect } from "./world";
import patrolsData from "../data/patrols.json";
import type { Palette } from "./types";

/** Corporate stealth rules. Pure functions so they stay testable outside Phaser. */
export const STEALTH = {
  viewRange: 4.5,
  halfAngle: (38 * Math.PI) / 180,
  noiseRadius: 2.6,
  runMultiplier: 1.65,
  fillPerSec: 55,
  decayPerSec: 30,
  hideRadius: 1.1,
  caughtCooldown: 6,
  caughtPenalty: { burnout: 20, fe: -5 },
  caughtMinutes: 45,
} as const;

export interface PatrolDef { id: string; name: string; palette: Palette; speed: number; route: [number, number][] }
export const PATROLS = patrolsData as unknown as PatrolDef[];

const COVER_TYPES = new Set(["plant", "armchair", "sofaWhite", "sofaDark"]);
const SIGHT_BLOCKERS = new Set(["column", "plant", "glass", "mezzanine", "aquarium", "reception", "sofaWhite", "sofaDark", "elevator", "screen"]);
export const COVERS: Rect[] = MAP.objects.filter((o) => COVER_TYPES.has(o.type));
const BLOCKERS: Rect[] = MAP.objects.filter((o) => SIGHT_BLOCKERS.has(o.type));

const inside = (x: number, y: number, r: Rect) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d;

/** Standing still beside a plant, sofa or armchair = pretending to be on a call. */
export function isHidden(x: number, y: number, moving: boolean, covers: Rect[] = COVERS) {
  if (moving) return false;
  return covers.some((c) => {
    const cx = Math.max(c.x, Math.min(x, c.x + c.w));
    const cy = Math.max(c.y, Math.min(y, c.y + c.d));
    return Math.hypot(x - cx, y - cy) < STEALTH.hideRadius;
  });
}

export function lineOfSight(ax: number, ay: number, bx: number, by: number, blockers: Rect[] = BLOCKERS) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.15);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (blockers.some((r) => inside(x, y, r))) return false;
  }
  return true;
}

export interface Watcher { x: number; y: number; facing: number }

/** 0 = unseen. Otherwise how strongly the player is noticed (closer = stronger). */
export function exposure(w: Watcher, px: number, py: number, opts: { hidden: boolean; running: boolean }) {
  if (opts.hidden) return 0;
  const dist = Math.hypot(px - w.x, py - w.y);
  if (opts.running && dist < STEALTH.noiseRadius) return 1.5;
  if (dist > STEALTH.viewRange) return 0;
  let diff = Math.atan2(py - w.y, px - w.x) - w.facing;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (Math.abs(diff) > STEALTH.halfAngle) return 0;
  if (!lineOfSight(w.x, w.y, px, py)) return 0;
  const closeness = 1 - dist / STEALTH.viewRange;
  return (0.6 + closeness) * (opts.running ? 1.5 : 1);
}

/** Advances the detection meter; returns the new meter and whether the player got caught. */
export function stepMeter(meter: number, exp: number, dt: number) {
  const next = exp > 0 ? meter + STEALTH.fillPerSec * exp * dt : meter - STEALTH.decayPerSec * dt;
  const clamped = Math.max(0, Math.min(100, next));
  return { meter: clamped >= 100 ? 0 : clamped, caught: clamped >= 100 };
}

export function routeIsWalkable(route: [number, number][], solids: Rect[] = SOLIDS) {
  for (let i = 0; i < route.length; i++) {
    const [ax, ay] = route[i]!, [bx, by] = route[(i + 1) % route.length]!;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.1);
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((bx - ax) * s) / steps, y = ay + ((by - ay) * s) / steps;
      if (solids.some((r) => x + 0.2 > r.x && x - 0.2 < r.x + r.w && y + 0.2 > r.y && y - 0.2 < r.y + r.d)) return false;
    }
  }
  return true;
}
