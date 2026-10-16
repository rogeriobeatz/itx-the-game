import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type PhaserNS from "phaser";
import { game } from "./core/store";
import { choose, DIALOGUES, interact, useItem, visibleChoices } from "./core/interactions";
import { applyEffects, currentObjective, objectiveProgress, fmtClock, ITEMS, QUESTS, sickLeave } from "./core/logic";
import { MAP } from "./core/world";
import { FLOORS, canVisit, floorDefinition } from "./core/floors";
import { navigationTarget, floorHasMission } from "./core/wayfinding";
import { interactionPoint, isometricDirection } from "./core/navigationHints";
import { CRISIS_DAY, RANKS, VICTORY_BTC } from "./core/pyramid";
import { BALANCE } from "./config/balance";
import { joystickVector, knobOffset, type InputVector } from "./core/touch";
import type { AvatarStyle } from "./core/types";
import { LOGO_URL, PORTRAITS, TITLE_BG } from "./assets";
import { GAME_TITLE, GAME_SUBTITLE } from "./brand";
import charactersData from "./data/characters.json";
import pitchData from "./data/pitch.json";

const CHARS = charactersData as { id: string; name: string; title: string }[];
const PITCH = pitchData as { text: string; options: string[]; correct: number }[];

function useGame() {
  return useSyncExternalStore(game.subscribe, game.get, game.get);
}

function focusGameCanvas(canvas?: HTMLCanvasElement | null) {
  if (!canvas || game.get().ui.modal !== null) return;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Mundo de INTERGALATIC; use WASD, setas e E para interagir");
  canvas.focus({ preventScroll: true });
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
      const { AnnexScene } = await import("./scenes/AnnexScene");
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
        scene: [OfficeScene, AnnexScene],
      });
      phaser.current = g;
      g.events.once(Phaser.Core.Events.READY, () => {
        const target = game.get().state.floor === "office" ? "office" : "annex";
        if (g && !g.scene.isActive(target)) g.scene.start(target);
        if (g) focusGameCanvas(g.canvas);
      });
    })();
    return () => {
      cancelled = true;
      g?.destroy(true);
    };
  }, []);

  useEffect(() => {
    const instance = phaser.current;
    if (!instance) return;
    const key = snap.state.floor === "office" ? "office" : "annex";
    instance.scene.start(key);
  }, [snap.state.floor]);

  // Closing any overlay (journal, inventory, pause, elevator, dialogue) restores
  // keyboard navigation without an extra click into the Phaser canvas.
  useEffect(() => {
    if (ui.modal !== null) return;
    const raf = requestAnimationFrame(() => focusGameCanvas(phaser.current?.canvas));
    return () => cancelAnimationFrame(raf);
  }, [ui.modal, snap.state.floor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { ui } = game.get();
      const k = e.key.toLowerCase();
      const target = e.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (!ui.modal && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (ui.modal === "title" || ui.modal === "gameover" || ui.modal === "pitch" || ui.modal === "ending") return;
      if (ui.modal === "dialogue") {
        const n = parseInt(k, 10);
        if (n >= 1 && n <= 9) choose(n - 1);
        if (k === "escape") game.setUI({ modal: null, dialogue: null });
        return;
      }
      if (k === "escape") return game.setUI({ modal: ui.modal ? null : "pause" });
      if (k === "i") return game.setUI({ modal: ui.modal === "inventory" ? null : "inventory" });
      if (k === "j") return game.setUI({ modal: ui.modal === "journal" ? null : "journal" });
      if (k === "p") return game.setUI({ modal: ui.modal === "pyramid" ? null : "pyramid" });
      if (k === "l") return game.setUI({ modal: ui.modal === "elevator" ? null : "elevator" });
      if (k === "h") return game.setUI({ modal: ui.modal === "help" ? null : "help" });
      if (k === "m") return game.setUI({ modal: ui.modal === "mobile_menu" ? null : "mobile_menu" });
      if (k === "e" && !ui.modal && ui.prompt) interact(ui.prompt.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const teleport = () => {
    const instance = phaser.current;
    if (!instance) return;
    const target = game.get().state.floor === "office" ? "office" : "annex";
    // A new run must also recreate the selected avatar texture if this scene was already active.
    instance.scene.start(target);
  };

  return (
    <div className="game-root">
      <div ref={host} className="absolute inset-0" />
      {ui.modal !== "title" && <Hud />}
      {ui.modal !== "title" && <MobileHud />}
      {ui.modal === null && <TouchControls emitMove={(dir) => phaser.current?.events.emit("virtual-move", dir)} />}
      {ui.prompt && !ui.modal && (
        <div className="prompt-hint">
          <span className="key-cap">E</span> {ui.prompt.label}
        </div>
      )}
      {ui.watch && <WatchBar elapsed={ui.watch.elapsed} />}
      {ui.stealth && snap.state.floor === "office" && !ui.modal && <StealthMeter {...ui.stealth} />}
      <Toasts />
      {ui.modal === "title" && <Title onStart={teleport} />}
      {ui.modal === "dialogue" && <DialogueBox />}
      {ui.modal === "inventory" && <Inventory />}
      {ui.modal === "journal" && <Journal />}
      {ui.modal === "pause" && <Pause onRestart={teleport} />}
      {ui.modal === "pitch" && <Pitch />}
      {ui.modal === "pyramid" && <PyramidPanel />}
      {ui.modal === "elevator" && <ElevatorPanel />}
      {ui.modal === "mobile_menu" && <MobileMenu />}
      {ui.modal === "help" && <HelpPanel />}
      {ui.modal === "ending" && <PyramidEnding onRestart={teleport} />}
      {ui.modal === "gameover" && <GameOver onBack={teleport} />}
    </div>
  );
}

function Bar({ label, value, kind }: { label: string; value: number; kind: "vida" | "fe" | "burnout" }) {
  const danger = kind === "burnout" ? value >= 75 : value <= 25;
  return (
    <div className={`stat-row ${danger ? "stat-danger" : ""}`}>
      <span className={`stat-icon icon-${kind}`} aria-hidden>
        {kind === "vida" ? "♥" : kind === "fe" ? "✦" : "▲"}
      </span>
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className={`stat-fill stat-${kind}`} style={{ width: `${value}%` }} />
        <div className="stat-ticks" />
      </div>
      <span className="stat-num">{Math.round(value)}</span>
    </div>
  );
}

function Hud() {
  const { state } = useGame();
  const s = state.stats;
  const p = state.pyramid;
  const active = QUESTS.filter((q) => state.quests[q.id as keyof typeof state.quests]?.status === "active");
  const alert = s.burnout >= 75 ? "ALERTA: BURNOUT CRÍTICO" : s.fe <= 25 ? "FÉ EM QUEDA LIVRE" : s.vida <= 25 ? "VIDA BAIXA" : null;
  return (
    <>
      <div className="pixel-panel hud-tl">
        {state.isGracePeriod && <div className="grace-period-label">TREINAMENTO · RELÓGIO PAUSADO</div>}
        <div className="hud-tag">FUNCIONÁRIO #0042 · {FLOORS.find((x) => x.id === state.floor)?.name ?? "Escritório"}</div>
        <Bar label="VIDA" value={s.vida} kind="vida" />
        <Bar label="FÉ" value={s.fe} kind="fe" />
        <Bar label="BURN" value={s.burnout} kind="burnout" />
      </div>
      {alert && <div className="hud-alert">⚠ {alert}</div>}
      <div className="pixel-panel hud-tr">
        <div className="hud-clock-big">
          <span className="hud-day">DIA {state.clock.day}</span>
          <span>{fmtClock(state.clock.minutes)}</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-wallet">
          <span className="hud-dim">Limpo</span>
          <span className="text-money hud-val">R$ {s.limpo}</span>
        </div>
        <div className="hud-wallet">
          <span className="hud-dim">Sujo</span>
          <span className="text-dirty hud-val">R$ {s.sujo}</span>
        </div>
        <div className="hud-wallet">
          <span className="hud-dim">Reputação</span>
          <span className="text-rep hud-val">★ {s.reputacao}</span>
        </div>
      </div>
      <button className="pixel-panel hud-pyramid-quick" style={{ position: "absolute", top: 146, left: 12, zIndex: 20, textAlign: "left", fontSize: 10, padding: 10, color: "#e4c8ff", cursor: "pointer" }} onClick={() => game.setUI({ modal: "pyramid" })}>
        <b>▲ {RANKS[p.rank]!.name.toUpperCase()}</b> · ₿ {p.btc.toFixed(4)}<br />
        <span style={{ color: "#fbbf69" }}>PF {p.heat}%</span> · <span style={{ color: "#ff7799" }}>FALÊNCIA {p.instability}%</span><br />
        <small>P: ABRIR PIRÂMIDE</small>
      </button>
      <div className="pixel-panel hud-bl">
        <div className="hud-tag">MISSÃO ATUAL</div>
        {active.length === 0 ? (
          <p className="hud-dim">Sem missão ativa. Procure alguém com <span className="text-rep">!</span></p>
        ) : (
          active.map((q) => (
            <div key={q.id} className="mb-2 last:mb-0">
              <div className="quest-title">{q.title}</div>
              <div className="quest-obj">▸ {objectiveProgress(state, q.id) ?? currentObjective(state, q.id)?.text}</div>
            </div>
          ))
        )}
        <div className="hud-help">
          <span className="key-cap">WASD</span>mover <span className="key-cap">E</span>agir <span className="key-cap">I</span>itens{" "}
          <span className="key-cap">J</span>diário <span className="key-cap">L</span>andares <span className="key-cap">H</span>ajuda <span className="key-cap">ESC</span>pausa
        </div>
      </div>
      <Minimap />
    </>
  );
}

/** Only the essentials stay on screen when playing by touch. */
function MobileHud() {
  const { state } = useGame();
  const target = navigationTarget(state);
  const ongoing = QUESTS.find(q => state.quests[q.id as keyof typeof state.quests]?.status === "active");
  const objective = ongoing && target?.quest === ongoing.title
    ? objectiveProgress(state, ongoing.id) ?? target.text
    : target?.text ?? (ongoing ? objectiveProgress(state, ongoing.id) ?? currentObjective(state, ongoing.id)?.text : undefined);
  const point = target?.floor === state.floor ? interactionPoint(state,target.interaction) : null;
  const arrow = target && target.floor !== state.floor ? "⇅" : point ? isometricDirection(state.pos,point) : "◆";
  return <div className="mobile-hud" aria-label="Status e objetivo atual">
    <div className="mobile-hud-top">
      <span className="mobile-hud-day">{state.isGracePeriod ? "TREINAMENTO · SEM PRESSÃO" : `D${state.clock.day} · ${fmtClock(state.clock.minutes)}`}</span>
      <span className="mobile-hud-vitals">♥ {Math.round(state.stats.vida)} <span className={state.stats.burnout>=70?"is-critical":""}>▲ {Math.round(state.stats.burnout)}%</span></span>
      <button type="button" className="mobile-hud-menu" onClick={() => game.setUI({ modal: "mobile_menu" })} aria-label="Abrir menu">☰ MENU</button>
    </div>
    <button type="button" className="mobile-hud-objective" onClick={() => game.setUI({ modal: "journal" })}>
      <span className="mobile-hud-caption">◆ MISSÃO</span>
      <span className="mobile-hud-objective-text">{objective ?? "Explore o prédio e converse com os personagens."}</span>
      <span className="mobile-hud-chevron" aria-label={arrow === "⇅" ? "Troque de andar" : "Direção do objetivo"}>{arrow}</span>
    </button>
  </div>;
}

function MobileMenu() {
  const { state } = useGame();
  return <Modal title="MENU DO JOGO" hint="Toque fora para voltar ao jogo." onClose={() => game.setUI({ modal: null })}>
    <p className="dlg-text">Dia {state.clock.day} · {FLOORS.find(x=>x.id===state.floor)?.name}</p>
    <div className="mobile-menu-grid mt-4">
      <button className="pixel-btn pixel-btn-primary" onClick={() => game.setUI({ modal: "elevator" })}>⇅ ANDARES</button>
      <button className="pixel-btn" onClick={() => game.setUI({ modal: "journal" })}>◆ MISSÕES</button>
      <button className="pixel-btn" onClick={() => game.setUI({ modal: "inventory" })}>▣ ITENS</button>
      <button className="pixel-btn" onClick={() => game.setUI({ modal: "pyramid" })}>♛ CARREIRA</button>
      <button className="pixel-btn" onClick={() => game.setUI({ modal: "help" })}>? COMO JOGAR</button>
      <button className="pixel-btn" onClick={() => game.setUI({ modal: "pause" })}>Ⅱ PAUSAR/SALVAR</button>
    </div>
  </Modal>;
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { ui, state } = useGame();
  const destination = navigationTarget(state);
  const annex = state.floor === "office" ? undefined : floorDefinition(state.floor);
  const width = annex?.size[0] ?? MAP.width;
  const height = annex?.size[1] ?? MAP.height;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = 6;
    const css = getComputedStyle(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = css.getPropertyValue("--mm-floor");
    ctx.fillRect(0, 0, width * S, height * S);
    if (state.floor === "office") {
      ctx.fillStyle = css.getPropertyValue("--mm-path");
      for (const z of MAP.zones) ctx.fillRect(z.x * S, z.y * S, z.w * S, z.d * S);
    }
    ctx.fillStyle = css.getPropertyValue("--mm-solid");
    for (const o of annex?.decor ?? MAP.objects) ctx.fillRect(o.x * S, o.y * S, Math.max(1, o.w * S), Math.max(1, o.d * S));
    ctx.fillStyle = css.getPropertyValue("--mm-npc");
    for (const n of Object.values(ui.positions.npcs)) ctx.fillRect(n.x * S - 2, n.y * S - 2, 4, 4);
    // Distinct elevator locator: visible even on a busy minimap.
    const exit = (annex?.decor ?? MAP.objects).find((obj) => obj.id === "elevator");
    if (exit) {
      const x = (exit.ix ?? exit.x + exit.w / 2) * S;
      const y = (exit.iy ?? exit.y + exit.d + 0.5) * S;
      ctx.fillStyle = "#ffdd55";
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#201426";
      ctx.fillText("E", x, y + 0.5);
    }
    // Mission waypoint, distinct from the elevator marker.
    if (destination?.floor === state.floor) {
      const point = interactionPoint(state,destination.interaction);
      if (point) { ctx.fillStyle = "#32f0eb"; ctx.fillRect(point.x * S - 4, point.y * S - 4, 8, 8); }
    }
    ctx.fillStyle = css.getPropertyValue("--mm-player");
    ctx.fillRect(ui.positions.player.x * S - 3, ui.positions.player.y * S - 3, 6, 6);
  }, [ui.positions, state.floor, width, height, annex]);
  return (
    <div className="pixel-panel hud-br">
      <div className="hud-tag">MAPA · {FLOORS.find((x) => x.id === state.floor)?.level ?? "ESCRITÓRIO"}</div>
      <canvas key={state.floor} ref={ref} width={width * 6} height={height * 6} className="minimap" />
      {destination && <div className="floor-objective"><strong>◆ OBJETIVO</strong><span>{destination.floor === state.floor ? "Neste andar" : "Ir para " + (FLOORS.find(x=>x.id === destination.floor)?.name ?? "outro andar")}</span></div>}
      <button type="button" className="floor-shortcut" onClick={() => game.setUI({ modal: "elevator" })} title="Abrir seleção de andares (tecla L)">
        ⇵ ANDARES <span className="key-cap">L</span>
      </button>
    </div>
  );
}

function StealthMeter({ meter, hidden, running }: { meter: number; hidden: boolean; running: boolean }) {
  const level = meter > 60 ? "danger" : meter > 0 ? "warn" : "calm";
  const label = hidden ? "Em call de alinhamento (escondido)" : meter > 60 ? "Cobrança iminente!" : meter > 0 ? "Alguém te notou..." : running ? "Correndo — fazendo barulho" : "Fora do radar";
  return (
    <div className={`pixel-panel stealth-meter stealth-${level}`} role="status" aria-label="Detecção">
      <div className="stealth-label">{hidden ? "🪴" : meter > 60 ? "‼" : meter > 0 ? "👀" : running ? "💨" : "🕶"} {label}</div>
      <div className="stealth-track"><div className="stealth-fill" style={{ width: `${meter}%` }} /></div>
      <div className="stealth-hint">Shift corre · pare perto de plantas/sofás para se esconder</div>
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

/** Pick a visual style for a feedback message based on its wording. */
function toastKind(text: string): { kind: string; icon: string } {
  const t = text.toLowerCase();
  if (t.startsWith("missão iniciada")) return { kind: "quest", icon: "!" };
  if (t.startsWith("missão concluída")) return { kind: "done", icon: "✓" };
  if (t.startsWith("recebeu")) return { kind: "item", icon: "◆" };
  const m = t.match(/^([+-])\d+\s+(.+)$/);
  if (m) {
    const up = m[1] === "+";
    const stat = m[2]!;
    if (stat.startsWith("burnout")) return up ? { kind: "warn", icon: "▲" } : { kind: "up", icon: "▼" };
    if (stat.startsWith("fé") && !up) return { kind: "fe", icon: "✦" };
    if (stat.startsWith("reputa") && up) return { kind: "rep", icon: "★" };
    return up ? { kind: "up", icon: "▲" } : { kind: "down", icon: "▼" };
  }
  if (t.includes("salário")) return { kind: "up", icon: "$" };
  return { kind: "info", icon: "›" };
}

function Toasts() {
  const { ui } = useGame();
  return (
    <div className="toasts">
      {ui.toasts.map((t) => {
        const k = toastKind(t.text);
        return (
          <div key={t.id} className={`toast-item toast-${k.kind}`}>
            <span className="toast-icon">{k.icon}</span>
            {t.text}
          </div>
        );
      })}
    </div>
  );
}

function Title({ onStart }: { onStart: () => void }) {
  const [hasSave, setHasSave] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [avatar, setAvatar] = useState<AvatarStyle>("homem");
  useEffect(() => setHasSave(game.hasSave()), []);
  const start = (load: boolean) => {
    if (load) game.load();
    else game.reset(avatar);
    game.setUI({ modal: game.get().state.pyramid.outcome ? "ending" : null });
    if (!load) game.toast("Procure o totem de entrada!");
    onStart();
  };
  return (
    <div className="title-screen" style={{ backgroundImage: `url(${TITLE_BG})` }}>
      <div className="title-inner">
        <img src={LOGO_URL} alt="Logo Intergalatic" className="title-logo" width={96} height={96} />
        <h1 className="title-h1">{GAME_TITLE}</h1>
        <p className="title-sub">{GAME_SUBTITLE.toUpperCase()}</p>
        {choosing && <div className="avatar-picker" role="group" aria-label="Escolha seu protagonista">
          <p className="quest-title">QUEM COMEÇA O EXPEDIENTE?</p>
          <div className="avatar-options">
            <button className={`avatar-choice ${avatar === "homem" ? "selected" : ""}`} onClick={() => setAvatar("homem")} aria-pressed={avatar === "homem"}><span className="avatar-figure avatar-man" aria-hidden="true">◆</span>HOMEM</button>
            <button className={`avatar-choice ${avatar === "mulher" ? "selected" : ""}`} onClick={() => setAvatar("mulher")} aria-pressed={avatar === "mulher"}><span className="avatar-figure avatar-woman" aria-hidden="true">◆</span>MULHER</button>
          </div>
          <p className="hud-dim">Escolha apenas visual, sem diferenças de atributos.</p>
        </div>}
        <div className="flex flex-col gap-3 mt-8 w-64">
          {hasSave && (
            <button className="pixel-btn pixel-btn-primary" onClick={() => start(true)}>
              CONTINUAR
            </button>
          )}
          <button className={`pixel-btn ${hasSave ? "" : "pixel-btn-primary"}`} onClick={() => choosing ? start(false) : setChoosing(true)}>
            {choosing ? "COMEÇAR O EXPEDIENTE" : hasSave ? "NOVO JOGO" : "JOGAR"}
          </button>
        </div>
        <p className="title-foot">Um RPG de sobrevivência corporativa. Bata o ponto. Se puder.</p>
        <p className="title-mobile-note">Funciona com teclado no computador e controles na tela no celular.</p>
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
          <div className="dlg-head">
            <span className="dlg-name">{char?.name}</span>
            <span className="dlg-role">{char?.title}</span>
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

function Modal({ title, hint, children, onClose }: { title: string; hint?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pixel-panel modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="pixel-btn pixel-btn-sm" onClick={onClose} aria-label="Fechar">
            X
          </button>
        </div>
        {children}
        {hint && <p className="modal-hint">{hint}</p>}
      </div>
    </div>
  );
}

function Inventory() {
  const { state } = useGame();
  const close = () => game.setUI({ modal: null });
  return (
    <Modal title="INVENTÁRIO" hint={`${state.inventory.length} itens · I para fechar`} onClose={close}>
      {state.inventory.length === 0 && (
        <div className="empty-slot">
          <span className="empty-icon">▢</span>
          <p className="hud-dim">Vazio. Como sua caixa de benefícios.</p>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {state.inventory.map((id, i) => {
          const it = ITEMS[id];
          return (
            <li key={i} className="inv-item">
              <span className="inv-icon" aria-hidden>
                {id === "bau" ? "▣" : id === "cafe" ? "☕" : "◆"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="quest-title">{it?.name ?? id}</div>
                <div className="quest-obj">{it?.desc}</div>
              </div>
              {it?.use ? (
                <button className="pixel-btn pixel-btn-sm pixel-btn-primary" onClick={() => useItem(id, it.use!)}>
                  USAR
                </button>
              ) : (
                <span className="status-tag status-available">ITEM-CHAVE</span>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

const STATUS_LABEL = { available: "Disponível", active: "Ativa", completed: "Concluída", failed: "Falhou" };
const MAIN_QUESTS = ["bau"];

function QuestCard({ q }: { q: (typeof QUESTS)[number] }) {
  const { state } = useGame();
  const st = state.quests[q.id as keyof typeof state.quests];
  if (!st) return null;
  return (
    <div className={`inv-item flex-col items-start quest-card quest-${st.status}`}>
      <div className="flex w-full justify-between gap-2">
        <span className="quest-title">{q.title}</span>
        <span className={`status-tag status-${st.status}`}>{STATUS_LABEL[st.status]}</span>
      </div>
      <p className="quest-obj">{q.description}</p>
      {st.status !== "available" && (
        <ul className="mt-1">
          {q.objectives.map((o, i) => (
            <li key={o.id} className={i < st.step || st.status === "completed" ? "obj-done" : i === st.step ? "obj-now" : "hud-dim"}>
              {i < st.step || st.status === "completed" ? "✓" : i === st.step ? "▸" : "□"} {o.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Journal() {
  const { state } = useGame();
  const complete = QUESTS.filter(q=>state.quests[q.id as keyof typeof state.quests]?.status === "completed").length;
  const main = QUESTS.filter((q) => MAIN_QUESTS.includes(q.id));
  const side = QUESTS.filter((q) => !MAIN_QUESTS.includes(q.id));
  return (
    <Modal title="DIÁRIO DE MISSÕES" hint="J para fechar" onClose={() => game.setUI({ modal: null })}>
      <div className="section-label">{complete} DE {QUESTS.length} MISSÕES CONCLUÍDAS</div>
      <button className="pixel-btn pixel-btn-sm mt-2 mb-3" onClick={() => game.setUI({ modal: "elevator" })}>⇵ ESCOLHER ANDAR DE UMA MISSÃO</button>
      <div className="section-label">MISSÃO PRINCIPAL</div>
      <div className="flex flex-col gap-3">
        {main.map((q) => <QuestCard key={q.id} q={q} />)}
      </div>
      <div className="section-label mt-4">SIDEQUESTS</div>
      <div className="flex flex-col gap-3">
        {side.map((q) => <QuestCard key={q.id} q={q} />)}
      </div>
    </Modal>
  );
}

function Pause({ onRestart }: { onRestart: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title="PAUSA" hint="O relógio parou. O boleto não." onClose={() => game.setUI({ modal: null })}>
      <div className="flex flex-col gap-3">
        <button className="pixel-btn pixel-btn-primary" onClick={() => game.setUI({ modal: null })}>
          CONTINUAR
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="pixel-btn" onClick={() => game.setUI({ modal: "inventory" })}>
            INVENTÁRIO
          </button>
          <button className="pixel-btn" onClick={() => game.setUI({ modal: "journal" })}>
            DIÁRIO
          </button>
        </div>
        <button
          className="pixel-btn"
          onClick={() => {
            game.save();
            game.toast("Progresso salvo.");
          }}
        >
          SALVAR
        </button>
        {confirm ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="pixel-btn pixel-btn-danger"
              onClick={() => {
                game.reset();
                game.setUI({ modal: null, watch: null, dialogue: null });
                onRestart();
              }}
            >
              SIM, REINICIAR
            </button>
            <button className="pixel-btn" onClick={() => setConfirm(false)}>
              CANCELAR
            </button>
          </div>
        ) : (
          <button className="pixel-btn" onClick={() => setConfirm(true)}>
            REINICIAR
          </button>
        )}
        <button
          className="pixel-btn"
          onClick={() => {
            game.save();
            game.setUI({ modal: "title" });
            onRestart();
          }}
        >
          VOLTAR AO MENU
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



function HelpPanel() {
  return (
    <Modal title="MANUAL DE SOBREVIVÊNCIA" hint="H para fechar" onClose={() => game.setUI({ modal: null })}>
      <div className="flex flex-col gap-3 dlg-text">
        <p><strong>Primeiro dia:</strong> fale com a recepção, retire o crachá e conclua o treinamento sem perder Fé ou ganhar Burnout.</p>
        <p><strong>WASD ou setas:</strong> mover pelo escritório. <strong>No celular:</strong> toque e arraste o joystick virtual no canto inferior esquerdo para caminhar, inclusive nas diagonais. Quanto mais longe do centro, mais rápido você anda.</p>
        <p><strong>E ou AGIR:</strong> falar com alguém ou ativar um objeto próximo.</p>
        <p><strong>L ou ANDARES:</strong> viajar de elevador. Alguns setores exigem uma patente maior.</p>
        <p><strong>P:</strong> acompanhar sua patente, BTC fictícios e o risco da empresa.</p>
        <p><strong>I / J:</strong> inventário e diário de missões.</p>
        <p><strong>◆ no minimapa:</strong> objetivo ativo neste andar. <strong>E amarelo:</strong> elevador.</p>
        <p>Você deve subir até Faraó, cumprir as missões e sacar antes da falência fictícia. Nada envolve dinheiro real.</p>
      </div>
      <button className="pixel-btn pixel-btn-primary mt-4" onClick={() => game.setUI({ modal: "elevator" })}>EXPLORAR ANDARES ⇵</button>
    </Modal>
  );
}

type StickPosition = { x: number; y: number };
type StickView = { origin: StickPosition; offset: StickPosition; active: boolean };
const REST_STICK: StickView = { origin: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, active: false };

function TouchControls({ emitMove }: { emitMove: (dir: InputVector) => void }) {
  const [stick, setStick] = useState<StickView>(REST_STICK);
  const pointer = useRef<number | null>(null);
  const anchor = useRef<StickPosition>({ x: 0, y: 0 });
  const sendRef = useRef(emitMove);
  sendRef.current = emitMove;

  const release = (pointerId?: number) => {
    if (pointerId !== undefined && pointer.current !== pointerId) return;
    if (pointer.current === null) return;
    pointer.current = null;
    sendRef.current({ sx: 0, sy: 0 });
    setStick(REST_STICK);
  };

  useEffect(() => {
    const onBlur = () => release();
    const onVisibility = () => { if (document.hidden) release(); };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      pointer.current = null;
      sendRef.current({ sx: 0, sy: 0 });
    };
  }, []);

  const begin = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const bounds = e.currentTarget.getBoundingClientRect();
    pointer.current = e.pointerId;
    anchor.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setStick({ origin: { x: e.clientX - bounds.left, y: e.clientY - bounds.top }, offset: { x: 0, y: 0 }, active: true });
    sendRef.current({ sx: 0, sy: 0 });
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - anchor.current.x;
    const dy = e.clientY - anchor.current.y;
    const offset = knobOffset(dx, dy);
    setStick((s) => ({ ...s, offset }));
    sendRef.current(joystickVector(dx, dy));
  };

  return <div className="touch-game-controls" aria-label="Controles móveis do jogo">
    <div className="touch-joystick-zone" role="group" aria-label="Toque e arraste para movimentar"
      onPointerDown={begin} onPointerMove={move}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}>
      {stick.active && <div className="touch-joystick-base is-active"
        style={stick.active ? { left: stick.origin.x, top: stick.origin.y } : undefined}>
        <div className="touch-joystick-inner" aria-hidden="true"/>
        <div className="touch-joystick-knob" style={{ transform: `translate(-50%, -50%) translate(${stick.offset.x}px, ${stick.offset.y}px)` }}>
          <span aria-hidden="true">✦</span>
        </div>
      </div>}
      <span className="touch-joystick-hint">ARRASTE PARA MOVER</span>
    </div>
    <div className="touch-actions">
      {game.get().ui.prompt && <button type="button" className="touch-action touch-primary touch-act" onClick={() => {
        const { ui } = game.get();
        if (ui.prompt && !ui.modal) interact(ui.prompt.id);
      }} aria-label="Interagir com objeto ou personagem próximo">AGIR</button>}
      <button type="button" className="touch-action touch-floor" onClick={() => game.setUI({ modal: "elevator" })} aria-label="Escolher andar">⇅</button>
    </div>
  </div>;
}

function ElevatorPanel() {
  const { state } = useGame();
  const floorCode: Record<string,string> = {office:"07",refeitorio:"R",studio11:"11",terraco:"T",portaria:"0",criativo:"08",compliance:"09",diretoria:"12",tesouraria:"COB"};
  const accessible = FLOORS.filter(floor => canVisit(state, floor.id));
  const locked = FLOORS.filter(floor => !canVisit(state, floor.id));
  const target = navigationTarget(state);
  const destination = target ? FLOORS.find(f => f.id === target.floor) : undefined;
  return <Modal title="ESCOLHA O ANDAR" hint="Viagem rápida também funciona sem procurar fisicamente o elevador." onClose={() => game.setUI({ modal: null })}>
    <p className="dlg-text">Você está em: <strong>{FLOORS.find(f => f.id === state.floor)?.name}</strong></p>
    {destination && destination.id !== state.floor && canVisit(state, destination.id) &&
      <button className="pixel-btn pixel-btn-primary elevator-destination mt-3" onClick={() => game.travelTo(destination.id)}>
        ◆ IR PARA A MISSÃO: {destination.name.toUpperCase()}
      </button>}
    <div className="section-label mt-3 mb-2">ANDARES DISPONÍVEIS</div>
    <div className="elevator-floor-list">
      {accessible.map(floor => <button key={floor.id} type="button" className={`elevator-floor ${state.floor===floor.id?"is-current":""}`} disabled={state.floor===floor.id}
        onClick={() => game.travelTo(floor.id)}>
        <span className="elevator-floor-number">{floorCode[floor.id] ?? "•"}</span>
        <span className="elevator-floor-text"><strong>{floor.name}</strong><small>{state.floor===floor.id?"Você está aqui":floorHasMission(state,floor.id)?"◆ Missão neste andar":state.visitedFloors.includes(floor.id)?"Já visitado":"Novo local"}</small></span>
        <span aria-hidden="true">›</span>
      </button>)}
    </div>
    {locked.length>0 && <details className="elevator-locked mt-3"><summary>🔒 {locked.length} andares ainda bloqueados</summary>
      {locked.map(floor => <div key={floor.id} className="elevator-locked-item">{floor.name} — requer patente {RANKS[floor.minRank]!.name}</div>)}
    </details>}
  </Modal>;
}

function PyramidPanel() {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const { state } = useGame();
  const p = state.pyramid;
  const next = RANKS[p.rank + 1];
  const pct = next ? Math.max(0, Math.min(100, 100 * (p.influence - RANKS[p.rank]!.influence) / (next.influence - RANKS[p.rank]!.influence))) : 100;
  return (
    <Modal title="A PIRÂMIDE CORPORATIVA" hint="Ficção satírica: nenhum bitcoin real é negociado. P para fechar." onClose={() => game.setUI({ modal: null })}>
      <div style={{ maxWidth: 520 }}>
        <div className="section-label">NÍVEL {p.rank + 1}/6: {RANKS[p.rank]!.name.toUpperCase()}</div>
        <p className="hud-dim mt-2">{state.visitedFloors.length}/{FLOORS.length} ambientes descobertos · {QUESTS.filter(q=>state.quests[q.id as keyof typeof state.quests]?.status === "completed").length} missões concluídas</p>
        <p className="dlg-text mt-2">Chegue a Faraó e saque antes da fiscalização ou falência.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {RANKS.map((x, i) => <span key={x.name} style={{ fontSize: 9, padding: 6, border: "1px solid #7659a0", color: i <= p.rank ? "#f4d5ff" : "#777", background: i === p.rank ? "#462363" : "#1a1424" }}>{x.name}</span>)}
        </div>
        <div className="quest-title mt-4">{next ? "Próxima promoção: " + p.influence + "/" + next.influence + " influência" : "PATAMAR MÁXIMO"}</div>
        <div className="stat-track mt-2"><div className="stat-fill stat-fe" style={{ width: pct + "%" }} /></div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="inv-item"><div><span className="hud-dim">BTC NA CARTEIRA</span><div className="quest-title mt-2">₿ {p.btc.toFixed(4)}</div></div></div>
          <div className="inv-item"><div><span className="hud-dim">BTC SACADOS</span><div className="quest-title mt-2">₿ {p.withdrawn.toFixed(4)}</div></div></div>
        </div>
        <div className="mt-4">⚠ ATENÇÃO DA PF FICTÍCIA: {p.heat}%</div>
        <div className="stat-track mt-2"><div className="stat-fill stat-burnout" style={{ width: p.heat + "%" }} /></div>
        <div className="mt-3">⌛ RISCO DE FALÊNCIA: {p.instability}%</div>
        <div className="stat-track mt-2"><div className="stat-fill stat-vida" style={{ width: p.instability + "%" }} /></div>
        <p className="hud-dim mt-3">Prazo: dia {CRISIS_DAY}. Hoje: dia {state.clock.day}. Vitória máxima: Faraó com pelo menos ₿ {VICTORY_BTC.toFixed(2)} sacados.</p>
        <p className="hud-dim mt-2">Para desbloquear Faraó: concluir O Baú Roxo e O Pitch Infinito. As missões também concedem influência.</p>
        <div className="flex flex-col gap-3 mt-4">
          <button className="pixel-btn pixel-btn-primary" onClick={() => game.pyramidAction("pitch")}>FAZER PITCH · +BTC +INFLUÊNCIA +RISCO</button>
          <button className="pixel-btn" disabled={state.stats.limpo < 40} onClick={() => game.pyramidAction("compliance")}>REUNIÃO DE COMPLIANCE TEATRAL · R$40 · -RISCO PF</button>
          {confirmWithdraw ? <div className="inv-item flex-col"><p className="dlg-text">Esse saque fictício encerra a partida imediatamente. Confirma?</p><div className="flex gap-3 mt-3"><button className="pixel-btn pixel-btn-primary" onClick={() => game.pyramidAction("withdraw")}>CONFIRMAR SAQUE</button><button className="pixel-btn" onClick={() => setConfirmWithdraw(false)}>CANCELAR</button></div></div> : <button className="pixel-btn" disabled={p.btc <= 0} onClick={() => setConfirmWithdraw(true)}>SACAR BTC E ENCERRAR PARTIDA</button>}
        </div>
        <p className="hud-dim mt-3">Trabalhe nos computadores para ganhar R$ limpos. Cada pitch custa 45 minutos e aumenta o risco.</p>
      </div>
    </Modal>
  );
}

function PyramidEnding({ onRestart }: { onRestart: () => void }) {
  const { state } = useGame();
  const p = state.pyramid;
  const outcomes = {
    farao: ["FINAL FARAÓ", "Você chegou ao topo e sacou antes do fim da pirâmide fictícia. Parabéns, sua PLR é imaginária!"],
    early_exit: ["SAQUE ANTECIPADO", "Você saiu enquanto ainda dava. Não virou Faraó, mas salvou os bitcoins fictícios."],
    raided: ["OPERAÇÃO PF", "A fiscalização fictícia chegou antes do saque. A pirâmide virou uma apresentação no PowerPoint."],
    bankrupt: ["FALÊNCIA", "A empresa fictícia quebrou e a carteira não sacada virou fumaça de PowerPoint."],
  };
  const info = outcomes[p.outcome ?? "bankrupt"]!;
  return <div className="modal-backdrop"><div className="pixel-panel modal-box text-center">
    <h2 className="gameover-title">{info[0]}</h2>
    <p className="dlg-text mt-4">{info[1]}</p>
    <p className="quest-title mt-4">{RANKS[p.rank]!.name} · Sacado: ₿ {p.withdrawn.toFixed(4)}</p>
    <button className="pixel-btn pixel-btn-primary mt-6" onClick={() => { game.reset(); game.setUI({ modal: null, dialogue: null, watch: null }); onRestart(); }}>JOGAR NOVAMENTE</button>
  </div></div>;
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
