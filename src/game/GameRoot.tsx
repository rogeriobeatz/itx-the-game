import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type PhaserNS from "phaser";
import { game } from "./core/store";
import { choose, DIALOGUES, interact, useItem, visibleChoices } from "./core/interactions";
import { applyEffects, currentObjective, fmtClock, ITEMS, QUESTS, sickLeave } from "./core/logic";
import { MAP } from "./core/world";
import { BALANCE } from "./config/balance";
import { LOGO_URL, PORTRAITS, TITLE_BG } from "./assets";
import charactersData from "./data/characters.json";
import pitchData from "./data/pitch.json";

const CHARS = charactersData as { id: string; name: string; title: string }[];
const PITCH = pitchData as { text: string; options: string[]; correct: number }[];

function useGame() {
  return useSyncExternalStore(game.subscribe, game.get, game.get);
}

export default function GameRoot() {
  const host = useRef<HTMLDivElement>(null);
  const phaser = useRef<PhaserNS.Game | null>(null);
  const snap = useGame();
  const { ui } = snap;

  useEffect(() => {
    let cancelled = false;
    let g: PhaserNS.Game | undefined;
    (async () => {
      const Phaser = (await import("phaser")).default;
      const { OfficeScene } = await import("./scenes/OfficeScene");
      try {
        await document.fonts.load("10px 'Press Start 2P'");
      } catch {
        /* font optional */
      }
      if (cancelled || !host.current) return;
      g = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        backgroundColor: "#07040d",
        pixelArt: true,
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        callbacks: { preBoot: (gm) => gm.registry.set("logoUrl", LOGO_URL) },
        scene: [OfficeScene],
      });
      phaser.current = g;
    })();
    return () => {
      cancelled = true;
      g?.destroy(true);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { ui } = game.get();
      const k = e.key.toLowerCase();
      if (ui.modal === "title" || ui.modal === "gameover" || ui.modal === "pitch") return;
      if (ui.modal === "dialogue") {
        const n = parseInt(k, 10);
        if (n >= 1 && n <= 9) choose(n - 1);
        if (k === "escape") game.setUI({ modal: null, dialogue: null });
        return;
      }
      if (k === "escape") return game.setUI({ modal: ui.modal ? null : "pause" });
      if (k === "i") return game.setUI({ modal: ui.modal === "inventory" ? null : "inventory" });
      if (k === "j") return game.setUI({ modal: ui.modal === "journal" ? null : "journal" });
      if (k === "e" && !ui.modal && ui.prompt) interact(ui.prompt.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const teleport = () => phaser.current?.events.emit("teleport", game.get().state.pos);

  return (
    <div className="game-root">
      <div ref={host} className="absolute inset-0" />
      {ui.modal !== "title" && <Hud />}
      {ui.prompt && !ui.modal && (
        <div className="prompt-hint">
          <span className="key-cap">E</span> {ui.prompt.label}
        </div>
      )}
      {ui.watch && <WatchBar elapsed={ui.watch.elapsed} />}
      <Toasts />
      {ui.modal === "title" && <Title onStart={teleport} />}
      {ui.modal === "dialogue" && <DialogueBox />}
      {ui.modal === "inventory" && <Inventory />}
      {ui.modal === "journal" && <Journal />}
      {ui.modal === "pause" && <Pause onRestart={teleport} />}
      {ui.modal === "pitch" && <Pitch />}
      {ui.modal === "gameover" && <GameOver onBack={teleport} />}
    </div>
  );
}

function Bar({ label, value, kind }: { label: string; value: number; kind: "vida" | "fe" | "burnout" }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className={`stat-fill stat-${kind}`} style={{ width: `${value}%` }} />
      </div>
      <span className="stat-num">{Math.round(value)}</span>
    </div>
  );
}

function Hud() {
  const { state } = useGame();
  const s = state.stats;
  const active = QUESTS.filter((q) => state.quests[q.id]?.status === "active");
  return (
    <>
      <div className="pixel-panel hud-tl">
        <Bar label="VIDA" value={s.vida} kind="vida" />
        <Bar label="FÉ" value={s.fe} kind="fe" />
        <Bar label="BURN" value={s.burnout} kind="burnout" />
      </div>
      <div className="pixel-panel hud-tr">
        <div className="hud-line">
          <span className="text-money">R$ {s.limpo}</span> <span className="hud-dim">limpo</span>
        </div>
        <div className="hud-line">
          <span className="text-dirty">R$ {s.sujo}</span> <span className="hud-dim">sujo</span>
        </div>
        <div className="hud-line">
          <span className="text-rep">★ {s.reputacao}</span> <span className="hud-dim">reputação</span>
        </div>
        <div className="hud-line hud-clock">
          DIA {state.clock.day} · {fmtClock(state.clock.minutes)}
        </div>
      </div>
      <div className="pixel-panel hud-bl">
        {active.length === 0 ? (
          <p className="hud-dim">Sem missão ativa. Procure alguém com <span className="text-rep">!</span></p>
        ) : (
          active.map((q) => (
            <div key={q.id} className="mb-2 last:mb-0">
              <div className="quest-title">{q.title}</div>
              <div className="quest-obj">▸ {currentObjective(state, q.id)?.text}</div>
            </div>
          ))
        )}
        <div className="hud-help">WASD mover · E interagir · I inventário · J diário · ESC pausa</div>
      </div>
      <Minimap />
    </>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { ui } = useGame();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const S = 6;
    const css = getComputedStyle(c);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = css.getPropertyValue("--mm-floor");
    ctx.fillRect(0, 0, MAP.width * S, MAP.height * S);
    ctx.fillStyle = css.getPropertyValue("--mm-path");
    for (const z of MAP.zones) ctx.fillRect(z.x * S, z.y * S, z.w * S, z.d * S);
    ctx.fillStyle = css.getPropertyValue("--mm-solid");
    for (const o of MAP.objects) ctx.fillRect(o.x * S, o.y * S, Math.max(1, o.w * S), Math.max(1, o.d * S));
    ctx.fillStyle = css.getPropertyValue("--mm-npc");
    for (const n of Object.values(ui.positions.npcs)) ctx.fillRect(n.x * S - 2, n.y * S - 2, 4, 4);
    ctx.fillStyle = css.getPropertyValue("--mm-player");
    ctx.fillRect(ui.positions.player.x * S - 3, ui.positions.player.y * S - 3, 6, 6);
  }, [ui.positions]);
  return (
    <div className="pixel-panel hud-br">
      <canvas ref={ref} width={MAP.width * 6} height={MAP.height * 6} className="minimap" />
    </div>
  );
}

function WatchBar({ elapsed }: { elapsed: number }) {
  const pct = Math.min(100, (elapsed / BALANCE.aquariumSeconds) * 100);
  return (
    <div className="pixel-panel watch-bar">
      <div className="quest-title">Contemplação Premium · {Math.ceil(BALANCE.aquariumSeconds - elapsed)}s</div>
      <div className="stat-track mt-2">
        <div className="stat-fill stat-fe" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Toasts() {
  const { ui } = useGame();
  return (
    <div className="toasts">
      {ui.toasts.map((t) => (
        <div key={t.id} className="toast-item">
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Title({ onStart }: { onStart: () => void }) {
  const [hasSave, setHasSave] = useState(false);
  useEffect(() => setHasSave(game.hasSave()), []);
  const start = (load: boolean) => {
    if (load) game.load();
    else game.reset();
    game.setUI({ modal: null });
    onStart();
  };
  return (
    <div className="title-screen" style={{ backgroundImage: `url(${TITLE_BG})` }}>
      <div className="title-inner">
        <img src={LOGO_URL} alt="Logo Intergalaxy" className="title-logo" width={96} height={96} />
        <h1 className="title-h1">INTERGALAXY</h1>
        <p className="title-sub">ALÉM DO EXPEDIENTE</p>
        <div className="flex flex-col gap-3 mt-8 w-64">
          {hasSave && (
            <button className="pixel-btn pixel-btn-primary" onClick={() => start(true)}>
              CONTINUAR
            </button>
          )}
          <button className={`pixel-btn ${hasSave ? "" : "pixel-btn-primary"}`} onClick={() => start(false)}>
            {hasSave ? "NOVO JOGO" : "JOGAR"}
          </button>
        </div>
        <p className="title-foot">Um RPG de sobrevivência corporativa. Bata o ponto. Se puder.</p>
      </div>
    </div>
  );
}

function DialogueBox() {
  const { ui } = useGame();
  const dlg = ui.dialogue!;
  const node = DIALOGUES[dlg.npc]?.nodes[dlg.node];
  const char = CHARS.find((c) => c.id === dlg.npc);
  if (!node) return null;
  const choices = visibleChoices(dlg.npc, dlg.node);
  return (
    <div className="dialogue-wrap">
      <div className="pixel-panel dialogue">
        <img src={PORTRAITS[dlg.npc]} alt={char?.name} className="portrait" width={160} height={160} />
        <div className="flex-1 min-w-0">
          <div className="dlg-name">
            {char?.name} <span className="hud-dim">· {char?.title}</span>
          </div>
          <p className="dlg-text">{node.text}</p>
          <div className="flex flex-col gap-1.5 mt-3">
            {choices.map((c, i) => (
              <button key={i} className="dlg-choice" onClick={() => choose(i)}>
                <span className="key-cap">{i + 1}</span> {c.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pixel-panel modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="modal-title">{title}</h2>
          <button className="pixel-btn pixel-btn-sm" onClick={onClose}>
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Inventory() {
  const { state } = useGame();
  const close = () => game.setUI({ modal: null });
  return (
    <Modal title="INVENTÁRIO" onClose={close}>
      {state.inventory.length === 0 && <p className="hud-dim">Vazio. Como sua caixa de benefícios.</p>}
      <ul className="flex flex-col gap-2">
        {state.inventory.map((id, i) => {
          const it = ITEMS[id];
          return (
            <li key={i} className="inv-item">
              <div>
                <div className="quest-title">{it?.name ?? id}</div>
                <div className="quest-obj">{it?.desc}</div>
              </div>
              {it?.use && (
                <button className="pixel-btn pixel-btn-sm" onClick={() => useItem(id, it.use!)}>
                  USAR
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

const STATUS_LABEL = { available: "Disponível", active: "Ativa", completed: "Concluída", failed: "Falhou" };

function Journal() {
  const { state } = useGame();
  return (
    <Modal title="DIÁRIO DE MISSÕES" onClose={() => game.setUI({ modal: null })}>
      <div className="flex flex-col gap-4">
        {QUESTS.map((q) => {
          const st = state.quests[q.id as keyof typeof state.quests];
          if (!st) return null;
          return (
            <div key={q.id} className="inv-item flex-col items-start">
              <div className="flex w-full justify-between gap-2">
                <span className="quest-title">{q.title}</span>
                <span className={`status-tag status-${st.status}`}>{STATUS_LABEL[st.status]}</span>
              </div>
              <p className="quest-obj">{q.description}</p>
              {st.status !== "available" && (
                <ul className="mt-1">
                  {q.objectives.map((o, i) => (
                    <li key={o.id} className={i < st.step || st.status === "completed" ? "obj-done" : i === st.step ? "obj-now" : "hud-dim"}>
                      {i < st.step || st.status === "completed" ? "✓" : "□"} {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function Pause({ onRestart }: { onRestart: () => void }) {
  return (
    <Modal title="PAUSA" onClose={() => game.setUI({ modal: null })}>
      <div className="flex flex-col gap-3">
        <button className="pixel-btn pixel-btn-primary" onClick={() => game.setUI({ modal: null })}>
          VOLTAR AO EXPEDIENTE
        </button>
        <button
          className="pixel-btn"
          onClick={() => {
            game.save();
            game.toast("Progresso salvo.");
          }}
        >
          SALVAR
        </button>
        <button
          className="pixel-btn"
          onClick={() => {
            game.save();
            game.setUI({ modal: "title" });
            onRestart();
          }}
        >
          MENU INICIAL
        </button>
      </div>
    </Modal>
  );
}

function Pitch() {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState<number>(BALANCE.pitch.secondsPerSlide);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { state } = useGame();

  const answer = (choice: number | null) => {
    if (feedback) return;
    const slide = PITCH[idx]!;
    const right = choice === slide.correct;
    const gain = BALANCE.pitch.baseBurnout + (choice === null ? BALANCE.pitch.timeoutBurnout : right ? 0 : BALANCE.pitch.wrongBurnout);
    game.setState(applyEffects(game.get().state, { stats: { burnout: gain, reputacao: right ? 2 : 0 } }).state);
    if (game.get().ui.modal === "gameover") return;
    setFeedback(right ? "O apresentador acena para você. Sinergia!" : choice === null ? "Você cochilou. O slide te julgou." : "Silêncio constrangedor. Seu burnout sobe.");
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= PITCH.length) {
        game.setUI({ modal: null });
        game.run({ advance: [{ quest: "pitch", objective: "watch_pitch" }] });
      } else {
        setIdx(idx + 1);
        setLeft(BALANCE.pitch.secondsPerSlide);
      }
    }, 1300);
  };

  useEffect(() => {
    if (feedback) return;
    if (left <= 0) {
      answer(null);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  });

  const slide = PITCH[idx]!;
  return (
    <div className="modal-backdrop">
      <div className="pixel-panel pitch-box">
        <div className="flex justify-between items-center">
          <span className="quest-title">O PITCH INFINITO · SLIDE {idx + 1}/{PITCH.length}</span>
          <span className="text-rep">{left}s</span>
        </div>
        <div className="pitch-slide">{slide.text}</div>
        <Bar label="BURN" value={state.stats.burnout} kind="burnout" />
        {feedback ? (
          <p className="dlg-text mt-4">{feedback}</p>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {slide.options.map((o, i) => (
              <button key={i} className="dlg-choice" onClick={() => answer(i)}>
                <span className="key-cap">{i + 1}</span> {o}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameOver({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  const reason = state.stats.burnout >= 100 ? "BURNOUT" : "COLAPSO";
  return (
    <div className="modal-backdrop">
      <div className="pixel-panel modal-box text-center">
        <h2 className="gameover-title">{reason}</h2>
        <p className="dlg-text mt-4">
          Você foi afastado. O RH mandou flores de plástico e um e-mail: "Sentimos sua falta (na planilha)".
        </p>
        <p className="hud-dim mt-2">Volta amanhã com atestado. Desconto de R$ {BALANCE.sickLeave.limpoPenalty}.</p>
        <button
          className="pixel-btn pixel-btn-primary mt-6"
          onClick={() => {
            game.setState(sickLeave(game.get().state));
            game.save();
            game.setUI({ modal: null, watch: null });
            onBack();
          }}
        >
          VOLTAR DO ATESTADO
        </button>
      </div>
    </div>
  );
}
