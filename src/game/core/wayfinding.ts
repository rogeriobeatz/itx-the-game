import { currentObjective, QUESTS } from "./logic";
import { FLOORS } from "./floors";
import type { FloorId, GameState } from "./types";

type Destination = { floor: FloorId; interaction: string };
const TARGETS: Record<string, Destination> = {
  "bau:talk_founder": { floor: "office", interaction: "npc:patriarca" },
  "bau:get_chest": { floor: "office", interaction: "npc:patriarca" },
  "bau:deliver_elevator": { floor: "office", interaction: "elevator" },
  "bau:culto": { floor: "studio11", interaction: "npc:profeta_kpi" },
  "bau:return_founder": { floor: "office", interaction: "npc:patriarca" },
  "aquario:watch": { floor: "office", interaction: "aquarium" },
  "pitch:watch_pitch": { floor: "office", interaction: "screen" },
  "refeicao:water": { floor: "refeitorio", interaction: "water" },
  "refeicao:eat": { floor: "refeitorio", interaction: "lunch" },
  "louvor:sing": { floor: "studio11", interaction: "louvor" },
  "respiro:rest": { floor: "terraco", interaction: "terrace_rest" },
  "credencial:register": { floor: "portaria", interaction: "security_check" },
  "credencial:badge": { floor: "portaria", interaction: "badge_desk" },
  "campanha:read": { floor: "criativo", interaction: "briefing" },
  "campanha:print": { floor: "criativo", interaction: "proof" },
  "auditoria:review": { floor: "compliance", interaction: "risk_board" },
  "auditoria:file": { floor: "compliance", interaction: "compliance_review" },
  "conselho:meet": { floor: "diretoria", interaction: "meeting_table" },
  "conselho:sign": { floor: "diretoria", interaction: "board_vote" },
  "tesouro:check": { floor: "tesouraria", interaction: "vault_status" },
};
export function navigationTarget(s: GameState): (Destination & { quest: string; text: string }) | null {
  for (const quest of QUESTS) {
    const obj = currentObjective(s, quest.id);
    if (!obj) continue;
    const target = TARGETS[quest.id + ":" + obj.id];
    if (target) return { ...target, quest: quest.title, text: obj.text };
  }
  if (s.quests.bau?.status === "available") {
    return { floor: "office", interaction: "npc:patriarca",
      quest: "O Baú Roxo", text: "Vá ao escritório e converse com o fundador" };
  }
  return null;
}
export function floorHasMission(s: GameState, floor: FloorId): boolean {
  return navigationTarget(s)?.floor === floor || QUESTS.some(q => {
    const obj = currentObjective(s, q.id);
    return obj ? TARGETS[q.id + ":" + obj.id]?.floor === floor : false;
  });
}
export function activeMissionLabels(s: GameState) {
  return FLOORS.filter(floor => floorHasMission(s, floor.id)).map(floor => floor.id);
}
