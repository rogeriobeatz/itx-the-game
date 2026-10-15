export type StatKey = "vida" | "fe" | "burnout" | "reputacao" | "limpo" | "sujo";
export type QuestId = "bau" | "aquario" | "pitch" | "refeicao" | "louvor" | "respiro";
export type FloorId = "office" | "refeitorio" | "studio11" | "terraco";
export type PyramidOutcome = "farao" | "early_exit" | "raided" | "bankrupt" | null;
export interface PyramidProgress { rank: number; influence: number; heat: number; instability: number; btc: number; withdrawn: number; outcome: PyramidOutcome; }
export type Palette = Record<"skin" | "hair" | "top" | "bottom" | "accent", string>;
export type QuestStatus = "available" | "active" | "completed" | "failed";

export interface Effects {
  stats?: Partial<Record<StatKey, number>>;
  give?: string[];
  take?: string[];
  flag?: string;
  startQuest?: string;
  advance?: { quest: string; objective: string }[];
  /** Game minutes that pass (e.g. working, resting). */
  minutes?: number;
}

export interface Cond {
  objective?: [string, string];
  questStatus?: [string, QuestStatus | QuestStatus[]];
  hasItem?: string;
  flag?: string;
  notFlag?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  npc: string;
  objectives: { id: string; text: string }[];
  rewards: Effects;
}

export interface ItemDef {
  name: string;
  desc: string;
  use?: Effects;
}

export interface GameState {
  stats: Record<StatKey, number>;
  pyramid: PyramidProgress;
  inventory: string[];
  quests: Record<QuestId, { status: QuestStatus; step: number }>;
  flags: Record<string, boolean>;
  clock: { day: number; minutes: number };
  pos: { x: number; y: number };
  floor: FloorId;
}

export interface DialogueChoice {
  text: string;
  effects?: Effects;
  next?: string;
  cond?: Cond;
}
export interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}
export interface NpcDialogue {
  entries: { cond?: Cond; node: string }[];
  nodes: Record<string, DialogueNode>;
}
