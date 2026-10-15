import floorData from "../data/floors.json";
import type { FloorId, GameState } from "./types";
import { currentObjective } from "./logic";
import { MAP } from "./world";

export interface AnnexObject { type: string; x: number; y: number; w: number; d: number; id?: string; label?: string; ix?: number; iy?: number; }
export interface AnnexDef { id: Exclude<FloorId, "office">; name: string; level: string; minRank: number; size: [number, number]; spawn: [number, number]; floorColor: string; decor: AnnexObject[]; }
export const ANNEX_FLOORS = floorData as AnnexDef[];
export const FLOORS: { id: FloorId; name: string; level: string; minRank: number }[] = [
  { id: "office", name: "Escritório principal", level: "Andar 7 · ficção", minRank: 0 },
  ...ANNEX_FLOORS.map(({ id, name, level, minRank }) => ({ id, name, level, minRank })),
];
export function floorDefinition(id: FloorId) { return ANNEX_FLOORS.find((floor) => floor.id === id); }
export function canVisit(s: GameState, id: FloorId) {
  const floor = FLOORS.find((f) => f.id === id);
  if (!floor) return false;
  return s.pyramid.rank >= floor.minRank || (id === "studio11" && currentObjective(s, "bau")?.id === "culto");
}
export function floorSize(id: FloorId): [number, number] {
  if (id === "office") return [MAP.width, MAP.height];
  return floorDefinition(id)?.size ?? [MAP.width, MAP.height];
}
export function arrivalPoint(id: FloorId): { x: number; y: number } {
  if (id === "office") return { x: 15.2, y: 2.2 };
  const floor = floorDefinition(id);
  return floor ? { x: floor.spawn[0], y: floor.spawn[1] } : { x: 10, y: 10 };
}
