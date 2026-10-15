import dialoguesData from "../data/dialogues.json";
import { checkCond, currentObjective } from "./logic";
import { game } from "./store";
import type { DialogueChoice, NpcDialogue } from "./types";

export const DIALOGUES = dialoguesData as Record<string, NpcDialogue>;

export function openDialogue(npc: string) {
  const d = DIALOGUES[npc];
  if (!d) return;
  const s = game.get().state;
  const entry = d.entries.find((e) => checkCond(s, e.cond));
  if (entry) game.setUI({ modal: "dialogue", dialogue: { npc, node: entry.node } });
}

export function visibleChoices(npc: string, node: string): DialogueChoice[] {
  const s = game.get().state;
  return DIALOGUES[npc]?.nodes[node]?.choices.filter((c) => checkCond(s, c.cond)) ?? [];
}

export function choose(index: number) {
  const dlg = game.get().ui.dialogue;
  if (!dlg) return;
  const choice = visibleChoices(dlg.npc, dlg.node)[index];
  if (!choice) return;
  if (choice.effects) game.run(choice.effects);
  if (game.get().ui.modal === "gameover") return;
  if (choice.next) game.setUI({ dialogue: { npc: dlg.npc, node: choice.next } });
  else game.setUI({ modal: null, dialogue: null });
}

const FLAVOR: Record<string, string[]> = {
  stairs: [
    "Escadaria em espiral até o mezanino. Interditada 'temporariamente' desde 2019.",
    "Você sobe dois degraus e sente que já merece um aumento.",
  ],
  reception: [
    "Recepção: 'Bem-vindo! Seu crachá vem em 30 dias úteis. Use seu sorriso enquanto isso.'",
    "Recepção: 'Wi-Fi? A senha é Abundancia2026. Com A maiúsculo, como tudo aqui.'",
    "Recepção: 'O Francis pediu pra avisar que está no aquário... digo, na sala de vidro.'",
  ],
};
let flavorIdx = 0;

export function interact(id: string) {
  if (id.startsWith("npc:")) return openDialogue(id.slice(4));
  const s = game.get().state;

  if (id.startsWith("pc_")) {
    game.toast("Você responde 47 e-mails com 'Perfeito, alinhado!'");
    return game.run({ stats: { limpo: 20, burnout: 6, reputacao: 1 }, minutes: 30 });
  }
  switch (id) {
    case "elevator":
      if (currentObjective(s, "bau")?.id === "deliver_elevator" && s.inventory.includes("bau")) {
        game.toast("O baú some no elevador. Você escuta um 'obrigado' em latim.");
        return game.run({ take: ["bau"], advance: [{ quest: "bau", objective: "deliver_elevator" }], stats: { burnout: 5 } });
      }
      return game.toast("Elevador privativo. Acesso restrito a almas nível Diamante.");
    case "aquarium": {
      const q = s.quests.aquario;
      if (q.status === "completed") {
        game.toast("Os peixes te ignoram. Você já é íntimo demais.");
        return game.run({ stats: { burnout: -2 } });
      }
      if (game.get().ui.watch) return game.toast("Continue contemplando. Respira. Valoriza.");
      if (q.status !== "active") game.run({ startQuest: "aquario" });
      game.toast("Você começa a contemplar. Não se afaste!");
      return game.setUI({ watch: { elapsed: 0 } });
    }
    case "screen":
      if (s.quests.pitch.status === "active") return game.setUI({ modal: "pitch" });
      return game.toast("Telona 8K. Só liga com pitch agendado. Fale com o Mikey.");
    case "coffee":
      game.toast("A máquina faz um barulho de turbina e entrega... algo.");
      return game.run({ give: ["cafe"], stats: { fe: -1 }, minutes: 5 });
    case "sofa":
      game.toast("Você descansa 'pensativamente'. Ninguém percebe. Quase ninguém.");
      return game.run({ stats: { vida: 10, burnout: -8, reputacao: -2 }, minutes: 20 });
    default: {
      const lines = FLAVOR[id];
      if (lines) game.toast(lines[flavorIdx++ % lines.length]);
    }
  }
}

export function useItem(itemId: string, effects: import("./types").Effects) {
  game.run({ ...effects, take: [itemId] });
}
