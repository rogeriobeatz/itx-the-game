import { describe, expect, it } from "vitest";
import { BRAND_ICON, GAME_FULL_TITLE, GAME_SUBTITLE, GAME_TITLE } from "../brand";
describe("fictional game brand", () => {
  it("uses INTERGALATIC consistently as its sole public title", () => {
    expect(GAME_TITLE).toBe("INTERGALATIC");
    expect(GAME_SUBTITLE).toBe("Além do Expediente");
    expect(GAME_FULL_TITLE).toBe("INTERGALATIC — Além do Expediente");
  });
  it("serves its own SVG brand icon", () => {
    expect(BRAND_ICON).toBe("/intergalatic-symbol.svg");
  });
});
