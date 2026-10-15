import { describe, expect, it } from "vitest";
import characters from "../data/characters.json";
import dialogues from "../data/dialogues.json";
import floors from "../data/floors.json";
import quests from "../data/quests.json";

// Characters must have clearly invented, role-based aliases. Update this
// allowlist only after reviewing identity, likeness and dialogue privacy.
const FICTIONAL_CAST: Record<string, string> = {
  patriarca: "O Patriarca",
  carimbo: "Diretor Carimbo",
  fantasma: "Funcionário Fantasma",
  profeta_kpi: "Profeta KPI",
};

describe("fictional cast and privacy", () => {
  it("only publishes approved fictional character names", () => {
    expect(Object.fromEntries(characters.map((char) => [char.id, char.name]))).toEqual(FICTIONAL_CAST);
  });

  it("only defines dialogue speakers from the approved fictional cast", () => {
    expect(Object.keys(dialogues).sort()).toEqual(Object.keys(FICTIONAL_CAST).sort());
  });

  it("does not reference unregistered people as quest NPCs or world interactions", () => {
    const roleIds = new Set(Object.keys(FICTIONAL_CAST));
    const props = new Set(["aquario", "refeitorio", "auditorio", "terraco", "portaria", "criativo", "compliance", "diretoria", "tesouraria"]);
    for (const quest of quests) expect(roleIds.has(quest.npc) || props.has(quest.npc)).toBe(true);
    for (const floor of floors)
      for (const prop of floor.decor)
        if (prop.id?.startsWith("npc:")) expect(roleIds.has(prop.id.slice(4))).toBe(true);
  });
});
