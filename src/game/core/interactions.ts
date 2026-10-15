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
    "Recepção: 'O Patriarca pediu pra avisar que está no aquário... digo, na sala de vidro.'",
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
    case "security_check":
      if (s.quests.credencial?.status === "completed") return game.toast("Seu ponto está registrado. O sistema lembra de você.");
      if (s.quests.credencial?.status === "available") game.run({ startQuest: "credencial" });
      if (currentObjective(game.get().state,"credencial")?.id === "register")
        return game.run({ advance: [{ quest: "credencial", objective: "register" }], minutes: 5 });
      return game.toast("Cadastro confirmado. Busque seu crachá no balcão.");
    case "badge_desk":
      if (currentObjective(s,"credencial")?.id === "badge")
        return game.run({ advance: [{ quest: "credencial", objective: "badge" }], minutes: 3 });
      return game.toast("Documento aprovado somente após registro na portaria.");
    case "notice_board":
      return game.toast("Aviso: aqui todo mundo é sócio de sonhos. Crachás à direita.");
    case "briefing":
      if (s.quests.campanha?.status === "available") game.run({ startQuest: "campanha" });
      if (currentObjective(game.get().state,"campanha")?.id === "read")
        return game.run({ advance: [{ quest: "campanha", objective: "read" }], minutes: 12 });
      return game.toast("O briefing continua dizendo 'disruptar a disrupção'.");
    case "proof":
      if (currentObjective(s,"campanha")?.id === "print")
        return game.run({ advance: [{ quest: "campanha", objective: "print" }], minutes: 15 });
      return game.toast("Sem briefing, a impressora se recusa a imprimir.");
    case "design_wall":
      return game.toast("Campanhas 100% inspiração, 0% produto. Performance máxima.");
    case "risk_board":
      if (s.quests.auditoria?.status === "available") game.run({ startQuest: "auditoria" });
      if (currentObjective(game.get().state,"auditoria")?.id === "review")
        return game.run({ advance: [{ quest: "auditoria", objective: "review" }], minutes: 8 });
      return game.toast("O gráfico de compliance segue misteriosamente sempre verde.");
    case "compliance_review":
      if (currentObjective(s,"auditoria")?.id === "file")
        return game.run({ advance: [{ quest: "auditoria", objective: "file" }], minutes: 20 });
      return game.toast("Primeiro revise o painel de alertas.");
    case "archive_search":
      return game.toast("Arquivo: 72 relatórios de ética e um post-it dizendo 'alinhado'.");
    case "meeting_table":
      if (s.quests.conselho?.status === "available") game.run({ startQuest: "conselho" });
      if (currentObjective(game.get().state,"conselho")?.id === "meet")
        return game.run({ advance: [{ quest: "conselho", objective: "meet" }], minutes: 25 });
      return game.toast("O conselho permanece em reunião desde o trimestre passado.");
    case "board_vote":
      if (currentObjective(s,"conselho")?.id === "sign")
        return game.run({ advance: [{ quest: "conselho", objective: "sign" }], minutes: 10 });
      return game.toast("A ata ainda aguarda a reunião.");
    case "vault_rules":
      return game.toast("Protocolo cósmico: nenhum saque é real. A corporação é uma ficção.");
    case "vault_status":
      if (s.quests.tesouro?.status === "available") game.run({ startQuest: "tesouro" });
      if (currentObjective(game.get().state,"tesouro")?.id === "check")
        game.run({ advance: [{ quest: "tesouro", objective: "check" }], minutes: 5 });
      return game.setUI({ modal: "pyramid" });
    case "btc_vault":
      return game.setUI({ modal: "pyramid" });
    case "water":
      if (s.quests.refeicao.status === "completed") return game.toast("Garrafinha cheia. Seu KPI de hidratação já bateu.");
      if (s.quests.refeicao.status === "available") game.run({ startQuest: "refeicao" });
      if (currentObjective(game.get().state, "refeicao")?.id === "water") game.run({ advance: [{ quest: "refeicao", objective: "water" }], minutes: 3 });
      return game.toast("Hidratação corporativa concluída.");
    case "lunch":
      if (currentObjective(s, "refeicao")?.id === "eat") return game.run({ advance: [{ quest: "refeicao", objective: "eat" }], minutes: 20 });
      return game.toast("Sem garrafinha não tem almoço. Política de RH não escrita.");
    case "louvor":
      if (s.quests.louvor.status === "completed") return game.toast("Seu louvor já foi contabilizado na planilha celestial.");
      if (s.quests.louvor.status === "available") game.run({ startQuest: "louvor" });
      return game.run({ advance: [{ quest: "louvor", objective: "sing" }], minutes: 15 });
    case "yah_cafe":
      if (s.stats.limpo < 15) return game.toast("O Yah Café cobra R$ 15. Até a fé precisa de saldo limpo.");
      game.toast("Yah Café: café especial, fé e cafeína em doses desproporcionais.");
      return game.run({ stats: { limpo: -15, vida: 5, burnout: -10, fe: 2 }, minutes: 5 });
    case "terrace_rest":
      if (s.quests.respiro.status === "completed") return game.toast("O pufe já te reconhece. Hora de voltar ao corre.");
      if (s.quests.respiro.status === "available") game.run({ startQuest: "respiro" });
      return game.run({ advance: [{ quest: "respiro", objective: "rest" }], minutes: 15 });
    case "pyramid_terminal":
      return game.setUI({ modal: "pyramid" });
    case "elevator":
      if (currentObjective(s, "bau")?.id === "deliver_elevator" && s.inventory.includes("bau")) {
        game.toast("O baú some no elevador. Você escuta um 'obrigado' em latim.");
        game.run({ take: ["bau"], advance: [{ quest: "bau", objective: "deliver_elevator" }], stats: { burnout: 5 } });
        return game.toast("Baú despachado! Aperte E novamente para escolher o 11º andar.");
      }
      return game.setUI({ modal: "elevator" });
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
      return game.toast("Telona 8K. Só liga com pitch agendado. Fale com o Diretor Carimbo.");
    case "coffee":
      game.toast("A máquina faz um barulho de turbina e entrega... algo.");
      return game.run({ give: ["cafe"], stats: { fe: -1 }, minutes: 5 });
    case "sofa":
      game.toast("Você descansa 'pensativamente'. Ninguém percebe. Quase ninguém.");
      return game.run({ stats: { vida: 10, burnout: -8, reputacao: -2 }, minutes: 20 });
    default: {
      const lines = FLAVOR[id];
      if (lines) game.toast(lines[flavorIdx++ % lines.length] ?? "");
    }
  }
}

export function useItem(itemId: string, effects: import("./types").Effects) {
  game.run({ ...effects, take: [itemId] });
}
