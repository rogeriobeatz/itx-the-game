import mapData from "../data/map.json";

export interface MapObject {
  type: string;
  x: number;
  y: number;
  w: number;
  d: number;
  id?: string;
  label?: string;
  ix?: number;
  iy?: number;
  fig?: string;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

export const MAP = mapData as {
  width: number;
  height: number;
  zones: { x: number; y: number; w: number; d: number; floor: string }[];
  objects: MapObject[];
};

const NON_SOLID = new Set<string>([]);

export const SOLIDS: Rect[] = MAP.objects.filter((o) => !NON_SOLID.has(o.type));

export const INTERACTABLES = MAP.objects
  .filter((o) => o.id)
  .map((o) => ({
    id: o.id!,
    label: o.label ?? o.id!,
    x: o.ix ?? o.x + o.w / 2,
    y: o.iy ?? o.y + o.d + 0.5,
  }));

/** True when a square of half-size r centered at (px,py) hits the map edge or any rect. */
export function blocked(px: number, py: number, rects: Rect[], r = 0.22, W = MAP.width, H = MAP.height) {
  if (px - r < 0 || py - r < 0 || px + r > W || py + r > H) return true;
  return rects.some((o) => px + r > o.x && px - r < o.x + o.w && py + r > o.y && py - r < o.y + o.d);
}

/** Screen direction (sx,sy) to normalized iso tile direction. */
export function screenToTileDir(sx: number, sy: number) {
  const dx = sx + sy;
  const dy = sy - sx;
  const len = Math.hypot(dx, dy);
  return len === 0 ? { dx: 0, dy: 0 } : { dx: dx / len, dy: dy / len };
}
