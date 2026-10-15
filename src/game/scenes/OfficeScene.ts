import Phaser from "phaser";
import charactersData from "../data/characters.json";
import { BALANCE } from "../config/balance";
import { currentObjective } from "../core/logic";
import { game } from "../core/store";
import type { Palette } from "../core/types";
import { INTERACTABLES, MAP, SOLIDS, blocked, screenToTileDir, type MapObject, type Rect } from "../core/world";

const TW = 64;
const TH = 32;
const iso = (x: number, y: number) => ({ x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) });
const hex = (s: string) => parseInt(s.slice(1), 16);

interface CharDef {
  id: string;
  name: string;
  home: [number, number];
  wander: number;
  palette: Palette;
}
const CHARS = charactersData as unknown as CharDef[];

interface Actor {
  id: string;
  name: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  wait: number;
  home: [number, number];
  wander: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  mark?: Phaser.GameObjects.Text;
  walk: number;
}

function shade(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
}

export class OfficeScene extends Phaser.Scene {
  private player!: Actor;
  private npcs: Actor[] = [];
  keys!: Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", Phaser.Input.Keyboard.Key>;
  private posAcc = 0;
  private aquariumPoint = INTERACTABLES.find((i) => i.id === "aquarium")!;

  constructor() {
    super("office");
  }

  preload() {
    const logo = (this.game.registry.get("logoUrl") as string) ?? "";
    if (logo) this.load.image("logo", logo);
  }

  create() {
    this.cameras.main.setBackgroundColor("#07040d");
    this.drawFloor();
    this.drawWalls();
    for (const o of MAP.objects) this.drawObject(o);
    this.drawLights();

    const pal = { skin: "#d9a479", hair: "#151018", top: "#e4e0ec", bfantasmam: "#24203a", accent: "#7b4dff" };
    this.makeCharTexture("char-player", pal);
    const s = game.get().state;
    this.player = this.makeActor("player", "Você", s.pos.x, s.pos.y, "char-player");
    for (const c of CHARS.filter((c) => c.id !== "profeta_kpi")) {
      this.makeCharTexture(`char-${c.id}`, c.palette);
      const a = this.makeActor(c.id, c.name, c.home[0], c.home[1], `char-${c.id}`);
      a.home = c.home;
      a.wander = c.wander;
      a.mark = this.add.text(0, 0, "!", { fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ffd23f" }).setOrigin(0.5, 1).setStroke("#2a0a3a", 4);
      this.npcs.push(a);
    }

    const cam = this.cameras.main;
    const p = iso(this.player.x, this.player.y);
    cam.centerOn(p.x, p.y);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1, 0, 30);
    cam.setZoom(this.scale.width < 800 ? 1 : 1.25);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as OfficeScene["keys"];
    kb.disableGlobalCapture();

    // Allow restoring position from a reloaded save.
    const onTeleport = (pos: { x: number; y: number }) => {
      this.player.x = pos.x;
      this.player.y = pos.y;
    };
    this.game.events.on("teleport", onTeleport);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("teleport", onTeleport));
  }

  // ---------- drawing ----------
  private poly(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], color: number, alpha = 1) {
    g.fillStyle(color, alpha);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
  }

  /** Iso box. base = elevation px, h = height px. */
  private box(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    color: number,
    opts: { base?: number; alpha?: number; top?: number; left?: number; right?: number } = {},
  ) {
    const base = opts.base ?? 0;
    const a = opts.alpha ?? 1;
    const up = (p: { x: number; y: number }, hh: number) => ({ x: p.x, y: p.y - hh });
    const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
    this.poly(g, [up(D, base), up(C, base), up(C, base + h), up(D, base + h)], opts.left ?? shade(color, 0.62), a);
    this.poly(g, [up(B, base), up(C, base), up(C, base + h), up(B, base + h)], opts.right ?? shade(color, 0.8), a);
    this.poly(g, [up(A, base + h), up(B, base + h), up(C, base + h), up(D, base + h)], opts.top ?? color, a);
  }

  private depthOf(x: number, y: number) {
    return iso(x, y).y;
  }

  private drawFloor() {
    const g = this.add.graphics().setDepth(-100000);
    const zoneAt = (x: number, y: number) => {
      let f = "carpet";
      for (const z of MAP.zones) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.d) f = z.floor;
      return f;
    };
    const palette: Record<string, [number, number] | undefined> = {
      carpet: [0x3a1a63, 0x34175a],
      gray: [0x3b3a44, 0x35343e],
      dark: [0x1c1b24, 0x19181f],
      lounge: [0x4a4556, 0x453f50],
    };
    for (let y = 0; y < MAP.height; y++)
      for (let x = 0; x < MAP.width; x++) {
        const f = zoneAt(x + 0.5, y + 0.5);
        const [c1, c2] = palette[f] ?? [0x3a1a63, 0x34175a];
        const c = (x + y) % 2 ? c1 : c2;
        this.poly(g, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
        // speckle texture like the real stone walkway / carpet
        const seed = (x * 73 + y * 151) % 17;
        const speck = f === "carpet" ? 0x4a2680 : f === "lounge" ? 0x6a3a8a : 0x4a4954;
        for (let i = 0; i < 3; i++) {
          const fx = ((seed + i * 5) % 10) / 10 + 0.05;
          const fy = ((seed * 3 + i * 7) % 10) / 10 + 0.05;
          const p = iso(x + fx * 0.9, y + fy * 0.9);
          g.fillStyle(speck, 0.7);
          g.fillRect(p.x, p.y, 3, 2);
        }
      }
    // walkway edges
    g.lineStyle(1, 0x7b4dff, 0.25);
    for (let y = 0; y <= MAP.height; y++) {
      const a = iso(10, y), b = iso(14, y);
      if (y === 0 || y === MAP.height) g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private drawWalls() {
    const g = this.add.graphics().setDepth(-90000);
    const W = MAP.width, H = MAP.height;
    const wallH = 150;
    this.box(g, 0, -0.4, W, 0.4, wallH, 0x16131d, { left: 0x1d1926 });
    this.box(g, -0.4, -0.4, 0.4, H + 0.4, wallH, 0x16131d, { right: 0x1a1622 });
    const qN = (x1: number, x2: number, h1: number, h2: number, color: number, alpha = 1) => {
      const a = iso(x1, 0), b = iso(x2, 0);
      this.poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color, alpha);
    };
    const qW = (y1: number, y2: number, h1: number, h2: number, color: number, alpha = 1) => {
      const a = iso(0, y1), b = iso(0, y2);
      this.poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color, alpha);
    };
    // floor-to-ceiling windows with the night city
    for (let y = 2; y < H - 0.5; y += 1.6) {
      qW(y, y + 1.4, 8, 140, 0x10183a);
      for (let i = 0; i < 9; i++) {
        const yy = y + 0.15 + ((i * 37) % 11) / 10;
        const hh = 20 + ((i * 53) % 100);
        qW(yy, yy + 0.06, hh, hh + 5, 0xffd98a, 0.55);
      }
      qW(y + 1.4, y + 1.6, 0, 150, 0x0b0910);
    }
    // north wall: neon banners, quote, elevator, founder screen
    qN(1.5, 9, 108, 140, 0x2a2238);
    qN(10.2, 10.8, 30, 145, 0x7b2fd0);
    qN(13.2, 13.8, 30, 145, 0x7b2fd0);
    qN(14.6, 15.85, 0, 92, 0x2c2b36);
    qN(15.2, 15.24, 0, 92, 0x111015);
    qN(15.1, 15.35, 96, 102, 0xff3fd4);
    qN(16.6, 20.5, 40, 128, 0x4a2bd8);
    qN(16.8, 20.3, 50, 118, 0x7b4dff, 0.55);
    // vertical banner text
    const t1 = iso(10.5, 0);
    this.add.text(t1.x, t1.y - 88, "I\nN\nT\nE\nR", { fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#f3e9ff", align: "center", lineSpacing: 2 }).setOrigin(0.5).setDepth(-89000);
    const t2 = iso(13.5, 0);
    this.add.text(t2.x, t2.y - 88, "G\nA\nL\nA\nX", { fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#f3e9ff", align: "center", lineSpacing: 2 }).setOrigin(0.5).setDepth(-89000);
    const s = iso(18.55, 0);
    this.add.text(s.x, s.y - 84, "CONNECT\nBEYOND THE\nFUTURE", { fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ffffff", align: "center", lineSpacing: 3 }).setOrigin(0.5).setDepth(-89000);
    const q = iso(5.2, 0);
    this.add.text(q.x, q.y - 124, "A PROSPERIDADE É UM KPI", { fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#cbb8ff" }).setOrigin(0.5).setDepth(-89000);
    if (this.textures.exists("logo")) {
      const l = iso(7.5, 0);
      this.add.image(l.x + 70, l.y - 60, "logo").setDisplaySize(44, 44).setDepth(-89000).setAlpha(0.95);
    }
  }

  private drawObject(o: MapObject) {
    const g = this.add.graphics();
    const front = this.depthOf(o.x + o.w / 2, o.y + o.d / 2);
    g.setDepth(front);
    switch (o.type) {
      case "desk": {
        this.box(g, o.x, o.y, o.w, o.d, 22, 0x1d1b25);
        for (let i = 0; i < o.w; i++) {
          this.box(g, o.x + i + 0.2, o.y + 0.15, 0.6, 0.08, 20, 0x0e0d12, { base: 24, left: 0x6d55ff });
          this.box(g, o.x + i + 0.45, o.y + 0.25, 0.1, 0.1, 4, 0x2a2833, { base: 22 });
          this.box(g, o.x + i + 0.25, o.y + 0.55, 0.45, 0.15, 1, 0x2a2833, { base: 22 });
        }
        this.box(g, o.x + o.w - 0.3, o.y + 0.55, 0.14, 0.14, 12, hex(o.fig ?? "#d23a3a"), { base: 22 });
        break;
      }
      case "chair":
        this.box(g, o.x, o.y, o.w, o.d, 12, 0x15141b, { base: 6 });
        this.box(g, o.x, o.y + o.d - 0.12, o.w, 0.12, 28, 0x111016, { base: 18, left: 0x2b2236 });
        this.box(g, o.x + 0.05, o.y + o.d - 0.13, 0.1, 0.02, 22, 0x7b4dff, { base: 20 });
        break;
      case "column":
        this.box(g, o.x, o.y, o.w, o.d, 210, 0x15121c);
        this.box(g, o.x + 0.15, o.y + o.d, 0.7, 0.02, 120, 0x8a3cff, { base: 50, left: 0x8a3cff });
        this.box(g, o.x + o.w, o.y + 0.15, 0.02, 0.7, 120, 0x8a3cff, { base: 50, right: 0x6a2cd0 });
        break;
      case "aquarium":
        this.box(g, o.x, o.y, o.w, o.d, 18, 0x121018);
        this.box(g, o.x + 0.05, o.y + 0.05, o.w - 0.1, o.d - 0.1, 44, 0x3d32d8, { base: 18, alpha: 0.55, left: 0x3a2bff, right: 0x5b3df5 });
        this.box(g, o.x + 0.1, o.y + 0.1, o.w - 0.2, o.d - 0.2, 6, 0x5a1a8a, { base: 18 });
        this.addFish(o, front + 1);
        break;
      case "terminal":
        this.box(g, o.x, o.y, o.w, o.d, 23, 0x29213b, { top: 0x4c3276 });
        this.box(g, o.x + 0.12, o.y + 0.18, 0.55, 0.07, 19, 0x120e20, { base: 23, left: 0x9e60ff });
        break;
      case "elevator": {
        // The original elevator had no visible geometry. Give it an unmistakable doorway and sign.
        this.box(g, o.x, o.y, o.w, Math.max(o.d, 0.18), 91, 0x393042, {
          left: 0x8b63bc, right: 0x8b63bc, top: 0x704ba1,
        });
        this.box(g, o.x + 0.12, o.y + o.d - 0.13, o.w - 0.24, 0.13, 72, 0x8b829a, {
          left: 0x5a5265, right: 0xaaa1b5, top: 0xddd0e8,
        });
        this.box(g, o.x + o.w / 2 - 0.015, o.y + o.d - 0.14, 0.03, 0.14, 72, 0x191021);
        const door = iso(o.x + o.w / 2, o.y + o.d);
        const label = this.add.text(door.x, door.y - 113, "⇵ ELEVADOR", {
          fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#ffdf72",
          backgroundColor: "#24112f", padding: { x: 8, y: 5 },
        }).setOrigin(0.5).setDepth(front + 550).setStroke("#130914", 3);
        this.tweens.add({ targets: label, alpha: { from: 0.8, to: 1 }, y: { from: door.y - 115, to: door.y - 110 }, duration: 1300, yoyo: true, repeat: -1 });
        const floorMark = iso(15.0, 3.0);
        this.add.text(floorMark.x, floorMark.y - 8, "⇧ ELEVADOR", {
          fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#ffe99f",
          backgroundColor: "#21172a", padding: { x: 4, y: 4 },
        }).setOrigin(0.5).setDepth(front + 1).setStroke("#20152c", 2);
        break;
      }
      case "mezzanine":
        this.box(g, o.x, o.y, o.w, o.d, 10, 0x1a1720, { base: 86 });
        for (let i = 0; i <= o.w; i += 1) this.box(g, o.x + i, o.y + o.d - 0.06, 0.06, 0.06, 86, 0x2a2733);
        this.box(g, o.x, o.y + o.d - 0.05, o.w, 0.05, 26, 0x6a6878, { base: 96, alpha: 0.35 });
        break;
      case "stairs":
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 1.6;
          const cx = o.x + o.w / 2 + Math.cos(ang) * 0.4 - 0.2;
          const cy = o.y + o.d / 2 + Math.sin(ang) * 0.4 - 0.2;
          this.box(g, cx, cy, 0.4, 0.4, 4, 0x2c2a34, { base: i * 10 });
        }
        this.box(g, o.x + o.w / 2 - 0.06, o.y + o.d / 2 - 0.06, 0.12, 0.12, 96, 0x45434f);
        break;
      case "glass":
        this.box(g, o.x, o.y, o.w, o.d, 70, 0xb8a6ff, { alpha: 0.16 });
        this.box(g, o.x, o.y, o.w, o.d, 3, 0xd8ccff, { base: 70, alpha: 0.6 });
        break;
      case "founderDesk":
        this.box(g, o.x, o.y, o.w, o.d, 24, 0x0f0e13, { top: 0x2a2833 });
        this.box(g, o.x + 1.9, o.y + 0.25, 0.6, 0.4, 10, 0x1d1c24, { base: 24, left: 0x9a6bff });
        this.box(g, o.x + 0.4, o.y + 0.4, 0.2, 0.2, 8, 0xc0c0d0, { base: 24 });
        break;
      case "screen":
        this.box(g, o.x, o.y, o.w, o.d, 76, 0x111018, { base: 6, left: 0x6b3df5 });
        this.box(g, o.x + 0.3, o.y + o.d, 0.8, 0.01, 30, 0xffffff, { base: 30, left: 0xf0eaff, alpha: 0.8 });
        this.box(g, o.x + 3.2, o.y + o.d, 0.8, 0.01, 10, 0xb44cff, { base: 22, left: 0xd17cff });
        break;
      case "armchair":
        this.box(g, o.x, o.y, o.w, o.d, 14, 0x7a2fa8);
        this.box(g, o.x, o.y + o.d - 0.25, o.w, 0.25, 30, 0x8f3dc4);
        this.box(g, o.x, o.y, 0.15, o.d, 22, 0x6e2898);
        this.box(g, o.x + o.w - 0.15, o.y, 0.15, o.d, 22, 0x6e2898);
        break;
      case "sofaWhite":
        this.box(g, o.x, o.y, o.w, o.d, 14, 0xd6d2dc);
        this.box(g, o.x, o.y, o.w, 0.3, 30, 0xe4e0ea);
        this.box(g, o.x + 0.3, o.y + 0.3, 0.5, 0.15, 14, 0x2a2833, { base: 14 });
        this.box(g, o.x + o.w - 0.8, o.y + 0.3, 0.5, 0.15, 14, 0x2a2833, { base: 14 });
        break;
      case "sofaDark":
        this.box(g, o.x, o.y, o.w, o.d, 14, 0x34313c);
        this.box(g, o.x + o.w - 0.3, o.y, 0.3, o.d, 30, 0x3e3a48);
        for (let i = 0.5; i < o.d; i += 1.5) this.box(g, o.x + 0.4, o.y + i, 0.2, 0.5, 12, 0x9fb4ff, { base: 14 });
        break;
      case "table":
        this.box(g, o.x + 0.35, o.y + 0.35, 0.2, 0.2, 20, 0x22202a);
        this.box(g, o.x, o.y, o.w, o.d, 4, 0x4a4652, { base: 20 });
        this.box(g, o.x + 0.4, o.y + 0.4, 0.1, 0.1, 8, 0xbfe6ff, { base: 24, alpha: 0.7 });
        break;
      case "coffee":
        this.box(g, o.x, o.y, o.w, o.d, 30, 0x1b1a22);
        this.box(g, o.x + 0.2, o.y + 0.1, 0.5, 0.5, 22, 0x2c2b35, { base: 30 });
        this.box(g, o.x + 0.3, o.y + 0.6, 0.15, 0.02, 5, 0xff3f5a, { base: 40 });
        break;
      case "reception": {
        this.box(g, o.x, o.y, o.w, o.d, 32, 0x5c3a24, { top: 0x7a5034 });
        this.box(g, o.x - 0.05, o.y - 0.05, o.w + 0.1, o.d + 0.1, 3, 0x1a1820, { base: 32 });
        this.box(g, o.x + 0.4, o.y + 0.3, 0.6, 0.4, 16, 0xd8d8e0, { base: 35, left: 0xa0a0b0 });
        if (this.textures.exists("logo")) {
          const p = iso(o.x + o.w / 2, o.y + o.d);
          this.add.image(p.x - 30, p.y - 20, "logo").setDisplaySize(20, 20).setDepth(front + 1);
        }
        break;
      }
      case "plant":
        this.box(g, o.x, o.y, o.w, o.d, 16, 0x2a2730);
        {
          const p = iso(o.x + o.w / 2, o.y + o.d / 2);
          for (const [dx, dy, r, c] of [[0, -30, 14, 0x2f7a3a], [-8, -24, 10, 0x3d9a48], [9, -26, 10, 0x266a32], [0, -42, 9, 0x4fb258]] as const) {
            g.fillStyle(c, 1);
            g.fillCircle(p.x + dx, p.y + dy, r);
          }
        }
        break;
    }
  }

  private addFish(o: MapObject, depth: number) {
    const colors = [0xff8a3d, 0x4ff0ff, 0xffd23f, 0xff4fd8, 0x9dff6a];
    for (let i = 0; i < 6; i++) {
      const a = iso(o.x + 0.3, o.y + 0.5);
      const b = iso(o.x + o.w - 0.3, o.y + 0.5);
      const fy = -26 - (i % 3) * 10;
      const f = this.add.rectangle(a.x, a.y + fy, 6, 3, colors[i % colors.length]).setDepth(depth);
      this.tweens.add({
        targets: f,
        x: b.x,
        y: b.y + fy + ((i % 2) * 6 - 3),
        duration: 3000 + i * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
        delay: i * 400,
        onYoyo: () => f.setScale(-1, 1),
        onRepeat: () => f.setScale(1, 1),
      });
    }
  }

  private drawLights() {
    for (const [x, y] of <[number, number][]>[[4, 5], [4, 11], [12, 4], [12, 10], [12, 16], [20, 3], [19.5, 11], [19, 18.5], [4, 17]]) {
      const p = iso(x, y);
      this.add.ellipse(p.x, p.y, 220, 110, 0xb44cff, 0.07).setDepth(-99000).setBlendMode(Phaser.BlendModes.ADD);
      this.add.ellipse(p.x, p.y, 110, 55, 0xffe8ff, 0.05).setDepth(-99000).setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  private makeCharTexture(key: string, pal: Palette) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const P = 2;
    const px = (x: number, y: number, w: number, h: number, c: string) => {
      g.fillStyle(hex(c), 1);
      g.fillRect(x * P, y * P, w * P, h * P);
    };
    px(4, 0, 8, 3, pal.hair);
    px(3, 2, 10, 2, pal.hair);
    px(4, 3, 8, 6, pal.skin);
    px(3, 3, 1, 3, pal.hair);
    px(12, 3, 1, 3, pal.hair);
    px(5, 5, 2, 1, "#120c18");
    px(9, 5, 2, 1, "#120c18");
    px(6, 7, 4, 1, shadeHex(pal.skin));
    px(3, 9, 10, 9, pal.top);
    px(7, 9, 2, 6, pal.accent);
    px(1, 10, 2, 7, pal.top);
    px(13, 10, 2, 7, pal.top);
    px(1, 17, 2, 2, pal.skin);
    px(13, 17, 2, 2, pal.skin);
    px(4, 18, 8, 6, pal.bfantasmam);
    px(7, 20, 2, 4, "#0a0a0e");
    px(3, 24, 4, 2, "#0b0b10");
    px(9, 24, 4, 2, "#0b0b10");
    g.generateTexture(key, 16 * P, 26 * P);
    g.destroy();
  }

  private makeActor(id: string, name: string, x: number, y: number, tex: string): Actor {
    const shadow = this.add.ellipse(0, 0, 30, 12, 0x000000, 0.45);
    const sprite = this.add.image(0, 0, tex).setOrigin(0.5, 1);
    return { id, name, x, y, tx: x, ty: y, wait: 1, home: [x, y], wander: 0, sprite, shadow, walk: 0 };
  }

  private place(a: Actor) {
    const p = iso(a.x, a.y);
    const bob = Math.abs(Math.sin(a.walk * 10)) * 3;
    a.sprite.setPosition(p.x, p.y - bob);
    a.shadow.setPosition(p.x, p.y);
    const d = this.depthOf(a.x, a.y) + 0.5;
    a.sprite.setDepth(d);
    a.shadow.setDepth(d - 0.2);
    if (a.mark) {
      a.mark.setPosition(p.x, p.y - 60 - Math.sin(this.time.now / 200) * 3);
      a.mark.setDepth(d + 1);
    }
  }

  private actorRect(a: Actor): Rect {
    return { x: a.x - 0.25, y: a.y - 0.25, w: 0.5, d: 0.5 };
  }

  private hasMarker(id: string) {
    const s = game.get().state;
    switch (id) {
      case "patriarca":
        return s.quests.bau.status === "available" || currentObjective(s, "bau")?.id === "return_founder";
      case "profeta_kpi":
        return currentObjective(s, "bau")?.id === "culto";
      case "carimbo":
        return s.quests.pitch.status === "available" || s.quests.pitch.status === "failed";
      case "fantasma":
        return s.inventory.includes("pendrive");
    }
    return false;
  }

  override update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    const ui = game.get().ui;
    const paused = ui.modal !== null;
    const p = this.player;

    if (!paused) {
      const k = this.keys;
      const sx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const sy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      const { dx, dy } = screenToTileDir(sx, sy);
      if (dx || dy) {
        const sp = BALANCE.playerSpeed * dt;
        const rects = [...SOLIDS, ...this.npcs.map((n) => this.actorRect(n))];
        if (!blocked(p.x + dx * sp, p.y, rects)) p.x += dx * sp;
        if (!blocked(p.x, p.y + dy * sp, rects)) p.y += dy * sp;
        p.walk += dt;
        if (sx) p.sprite.setFlipX(sx < 0);
      } else p.walk = 0;
      game.tick(dt);
    }

    for (const n of this.npcs) {
      const near = Math.hypot(n.x - p.x, n.y - p.y) < 1.8;
      if (paused || near) {
        n.walk = 0;
      } else if (n.wait > 0) {
        n.wait -= dt;
        if (n.wait <= 0) {
          n.tx = n.home[0] + (Math.random() * 2 - 1) * n.wander;
          n.ty = n.home[1] + (Math.random() * 2 - 1) * n.wander;
        }
      } else {
        const ddx = n.tx - n.x, ddy = n.ty - n.y;
        const dist = Math.hypot(ddx, ddy);
        const sp = 1.1 * dt;
        const others = [...SOLIDS, this.actorRect(p)];
        if (dist < 0.05) n.wait = 1.5 + Math.random() * 3;
        else {
          const nx = n.x + (ddx / dist) * sp, ny = n.y + (ddy / dist) * sp;
          if (blocked(nx, ny, others, 0.2)) n.wait = 1 + Math.random();
          else {
            n.x = nx;
            n.y = ny;
            n.walk += dt;
            n.sprite.setFlipX(ddx - ddy < 0);
          }
        }
      }
      n.mark?.setVisible(this.hasMarker(n.id));
      this.place(n);
    }
    this.place(p);

    // nearest interactable
    let best: { id: string; label: string; d: number } | null = null;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < BALANCE.interactRadius && (!best || d < best.d)) best = { id: `npc:${n.id}`, label: `Falar com ${n.name}`, d };
    }
    for (const it of INTERACTABLES) {
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < BALANCE.interactRadius && (!best || d < best.d)) best = { id: it.id, label: it.label, d };
    }
    const cur = ui.prompt;
    if ((best?.id ?? null) !== (cur?.id ?? null)) game.setUI({ prompt: best ? { id: best.id, label: best.label } : null });

    if (ui.watch && !paused) {
      game.tickWatch(dt, Math.hypot(this.aquariumPoint.x - p.x, this.aquariumPoint.y - p.y) < BALANCE.aquariumRadius);
    }

    this.posAcc += dt;
    if (this.posAcc > 0.15) {
      this.posAcc = 0;
      game.setPositions({
        player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2) },
        npcs: Object.fromEntries(this.npcs.map((n) => [n.id, { x: n.x, y: n.y }])),
      });
    }
  }
}

function shadeHex(c: string) {
  const n = shade(hex(c), 0.75);
  return "#" + n.toString(16).padStart(6, "0");
}
