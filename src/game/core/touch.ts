/** Analog joystick motion uses screen-space vectors; neither scene manages touch events. */
import { screenToTileDir } from "./world";

export interface InputVector { sx: number; sy: number }
export const JOYSTICK_RADIUS = 54;
export const JOYSTICK_DEADZONE = 0.14;
export const ZERO_INPUT: Readonly<InputVector> = { sx: 0, sy: 0 };

export function joystickVector(deltaX: number, deltaY: number, radius = JOYSTICK_RADIUS): InputVector {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !Number.isFinite(radius) || radius <= 0) {
    return { ...ZERO_INPUT };
  }
  const distance = Math.hypot(deltaX, deltaY);
  const deadzone = JOYSTICK_DEADZONE * radius;
  if (distance <= deadzone) return { ...ZERO_INPUT };
  const strength = Math.min(1, (distance - deadzone) / (radius - deadzone));
  return { sx: deltaX / distance * strength, sy: deltaY / distance * strength };
}

/** Keyboard remains full-speed. Analog thumb displacement gives proportional speed. */
export function playerMovement(keyX: number, keyY: number, analog: InputVector) {
  const sx = keyX + analog.sx;
  const sy = keyY + analog.sy;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return { dx: 0, dy: 0, amount: 0 };
  const amount = Math.min(1, Math.hypot(sx, sy));
  const { dx, dy } = screenToTileDir(sx, sy);
  return { dx, dy, amount };
}

/** Visual knob displacement is clamped, even when the pointer drags outside the control. */
export function knobOffset(deltaX: number, deltaY: number, radius = JOYSTICK_RADIUS) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return { x: 0, y: 0 };
  const scale = Math.min(1, radius / (Math.hypot(deltaX, deltaY) || 1));
  return { x: deltaX * scale, y: deltaY * scale };
}
