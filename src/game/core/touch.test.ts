import { describe, expect, it } from "vitest";
import { JOYSTICK_RADIUS, joystickVector, knobOffset, playerMovement } from "./touch";

describe("analog mobile joystick", () => {
  it("stays idle in the center and in the dead zone", () => {
    expect(joystickVector(0,0)).toEqual({sx:0,sy:0});
    expect(joystickVector(3,4)).toEqual({sx:0,sy:0});
  });
  it("supports every direction including diagonals", () => {
    const right=joystickVector(JOYSTICK_RADIUS,0);
    const left=joystickVector(-JOYSTICK_RADIUS,0);
    const down=joystickVector(0,JOYSTICK_RADIUS);
    const diagonal=joystickVector(42,-42);
    expect(right).toEqual({sx:1,sy:0});
    expect(left).toEqual({sx:-1,sy:0});
    expect(down.sy).toBe(1);
    expect(diagonal.sx).toBeGreaterThan(.65);
    expect(diagonal.sy).toBeLessThan(-.65);
  });
  it("gives proportional speed for small drags", () => {
    const slow=playerMovement(0,0,joystickVector(18,0));
    const fast=playerMovement(0,0,joystickVector(54,0));
    expect(slow.amount).toBeGreaterThan(0);
    expect(slow.amount).toBeLessThan(.3);
    expect(fast.amount).toBe(1);
  });
  it("keeps diagonal speed capped at one", () => {
    const a=playerMovement(1,1,{sx:0.6,sy:0.8});
    expect(a.amount).toBe(1);
    expect(Math.hypot(a.dx,a.dy)).toBeCloseTo(1);
  });
  it("never goes faster than maximum drag", () => {
    const far=joystickVector(500,-900);
    expect(Math.hypot(far.sx,far.sy)).toBeCloseTo(1);
    expect(Math.hypot(...Object.values(knobOffset(500,-900)))).toBeCloseTo(JOYSTICK_RADIUS);
  });
  it("is robust to invalid inputs", () => {
    expect(joystickVector(NaN,0)).toEqual({sx:0,sy:0});
    expect(joystickVector(10,4,0)).toEqual({sx:0,sy:0});
    expect(playerMovement(0,0,{sx:NaN,sy:0}).amount).toBe(0);
  });
  it("respects isometric projection so right swipe goes down-right in tile space", () => {
    const movement=playerMovement(0,0,joystickVector(54,0));
    expect(movement.dx).toBeGreaterThan(0);
    expect(movement.dy).toBeLessThan(0);
  });
  it("supports keyboard movement without joystick", () => {
    const movement=playerMovement(0,-1,{sx:0,sy:0});
    expect(movement.amount).toBe(1);
  });
});
