/** Directional mission compass for the isometric RPG, independent of the camera. */
import actors from "../data/characters.json";
import { floorDefinition } from "./floors";
import type { GameState } from "./types";
import { MAP } from "./world";

export interface TilePoint { x: number; y: number; }
export function interactionPoint(s: GameState, interaction: string): TilePoint | null {
  if (interaction.startsWith("npc:") && s.floor === "office") {
    const char = actors.find(c => c.id === interaction.slice(4));
    return char ? { x: char.home[0]!, y: char.home[1]! } : null;
  }
  const objects = s.floor === "office" ? MAP.objects : floorDefinition(s.floor)?.decor ?? [];
  const obj = objects.find(o => o.id === interaction);
  return obj ? { x: obj.ix ?? obj.x + obj.w / 2, y: obj.iy ?? obj.y + obj.d + .5 } : null;
}

const ARROWS = ["→","↘","↓","↙","←","↖","↑","↗"] as const;
export function isometricDirection(from: TilePoint, to: TilePoint): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const sx = dx - dy, sy = (dx + dy) / 2;
  if (Math.hypot(sx, sy) < 0.6) return "◆";
  const angle = Math.atan2(sy, sx);
  return ARROWS[((Math.round(angle / (Math.PI / 4)) + 8) % 8)]!;
}
