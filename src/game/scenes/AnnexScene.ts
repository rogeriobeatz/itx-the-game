import Phaser from "phaser";
import { BALANCE } from "../config/balance";
import { floorDefinition, type AnnexDef, type AnnexObject } from "../core/floors";
import { navigationTarget } from "../core/wayfinding";
import { game } from "../core/store";
import { playerMovement, type InputVector } from "../core/touch";
import { obstructionFeedback } from "../core/movementFeedback";
import { blocked, type Rect } from "../core/world";

const TW = 64;
const TH = 32;
const iso = (x: number, y: number) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 });
const color = (s: string) => parseInt(s.replace("#", ""), 16);
type Keys = Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", Phaser.Input.Keyboard.Key>;

/** Playable photo-inspired annexes: cafeteria, auditorium/Yah Café and outdoor lounge. */
export class AnnexScene extends Phaser.Scene {
  private floor!: AnnexDef;
  private player!: Phaser.GameObjects.Image;
  private keys!: Keys;
  private px = 10;
  private py = 3;
  private walk = 0;
  private posAcc = 0;
  private blockedHeld = 0;
  private lastBlockedNotice = -Infinity;
  private dustTimer = 0;
  private virtualDir: InputVector = { sx: 0, sy: 0 };
  private questMarkers: { objectId: string; marker: Phaser.GameObjects.Text; ring?: Phaser.GameObjects.Ellipse }[] = [];
  private solids: Rect[] = [];
  private points: { id: string; label: string; x: number; y: number }[] = [];

  constructor() { super("annex"); }

  create() {
    // Reset cached markers when returning to this scene from another floor.
    this.questMarkers = [];
    this.points = [];
    this.virtualDir = { sx: 0, sy: 0 };
    this.walk = 0;
    this.dustTimer = 0;
    this.blockedHeld = 0;
    const floor = floorDefinition(game.get().state.floor);
    if (!floor) return;
    this.floor = floor;
    this.px = game.get().state.pos.x;
    this.py = game.get().state.pos.y;
    this.posAcc = 0;
    this.cameras.main.setBackgroundColor(floor.id === "terraco" ? "#19273a" : "#0d0c18");
    this.paintFloor();
    this.paintArchitecture();
    for (const obj of floor.decor) this.paintObject(obj);
    this.solids = floor.decor.map((o) => ({ x: o.x, y: o.y, w: o.w, d: o.d }));
    this.points = floor.decor.filter((o) => o.id).map((o) => ({
      id: o.id!, label: o.label ?? o.id!,
      x: o.ix ?? o.x + o.w / 2, y: o.iy ?? o.y + o.d + 0.5,
    }));

    for (const point of this.points) {
      if (point.id === "elevator") continue;
      const pos = iso(point.x, point.y);
      const mark = this.add.text(pos.x, pos.y - 55, "◆", { fontFamily: "monospace", fontSize: "24px", color: "#ffe27b" }).setOrigin(0.5).setDepth(pos.y + 150).setStroke("#20112f", 4).setVisible(false);
      if(point.id==="badge_desk"){
        this.tweens.add({targets:mark,scale:1.3,alpha:0.55,duration:560,yoyo:true,repeat:-1});
        const ring=this.add.ellipse(pos.x,pos.y-5,62,26,0xf5d17c,0).setStrokeStyle(3,0xffde80)
          .setDepth(pos.y+140).setVisible(false);
        this.tweens.add({targets:ring,scaleX:1.35,scaleY:1.35,alpha:0.25,
          duration:700,yoyo:true,repeat:-1});
        this.questMarkers.push({ objectId: point.id, marker: mark, ring });
      } else this.questMarkers.push({ objectId: point.id, marker: mark });
    }
    const feminine = game.get().state.avatar === "mulher";
    const spriteKey = feminine ? "char-player-mulher" : "char-player-homem";
    if (!this.textures.exists(spriteKey)) {
      const maker = this.make.graphics({ x: 0, y: 0 }, false);
      maker.fillStyle(feminine ? 0x42314e : 0x241c30).fillRect(7, 0, 18, feminine ? 28 : 14);
      maker.fillStyle(0xe5c6a6).fillRect(10, 5, 12, 16);
      maker.fillStyle(feminine ? 0xc185db : 0x7b4dff).fillRect(7, 22, 18, 20);
      maker.fillStyle(0x151020).fillRect(10, 42, 6, 8).fillRect(21, 42, 6, 8);
      maker.generateTexture(spriteKey, 32, 52);
      maker.destroy();
    }
    this.player = this.add.image(0, 0, spriteKey).setOrigin(0.5, 1);
    this.repositionPlayer();
    const cam = this.cameras.main;
    const pt = iso(this.px, this.py);
    cam.centerOn(pt.x, pt.y);
    cam.startFollow(this.player, true, 0.12, 0.12, 0, 30);
    cam.setZoom(this.scale.width < 700 ? 1.35 : this.scale.width < 900 ? 1.1 : 1.25);
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Keys;
    this.input.keyboard!.disableGlobalCapture();

    const onTeleport = (pos: { x: number; y: number }) => {
      this.px = pos.x;
      this.py = pos.y;
      this.repositionPlayer();
    };
    const onVirtualMove = (dir: InputVector) => { this.virtualDir = dir; };
    this.game.events.on("teleport", onTeleport);
    this.game.events.on("virtual-move", onVirtualMove);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("teleport", onTeleport);
      this.game.events.off("virtual-move", onVirtualMove);
      game.setUI({ prompt: null });
    });
  }

  private diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, d: number, c: number) {
    g.fillStyle(c);
    g.fillPoints([iso(x,y),iso(x+w,y),iso(x+w,y+d),iso(x,y+d)].map((p)=>new Phaser.Geom.Point(p.x,p.y)),true);
  }
  private box(g: Phaser.GameObjects.Graphics, o: AnnexObject, h: number, top: number, base = 0) {
    const a=iso(o.x,o.y), b=iso(o.x+o.w,o.y), c=iso(o.x+o.w,o.y+o.d), d=iso(o.x,o.y+o.d);
    const face=(pts:{x:number;y:number}[], shade:number) => {
      g.fillStyle(shade);
      g.fillPoints(pts.map((p)=>new Phaser.Geom.Point(p.x,p.y)),true);
    };
    face([{x:d.x,y:d.y-base},{x:c.x,y:c.y-base},{x:c.x,y:c.y-base-h},{x:d.x,y:d.y-base-h}],Phaser.Display.Color.IntegerToColor(top).darken(32).color);
    face([{x:b.x,y:b.y-base},{x:c.x,y:c.y-base},{x:c.x,y:c.y-base-h},{x:b.x,y:b.y-base-h}],Phaser.Display.Color.IntegerToColor(top).darken(15).color);
    face([a,b,c,d].map(p=>({x:p.x,y:p.y-base-h})),top);
  }
  private paintFloor() {
    const g=this.add.graphics().setDepth(-100000);
    const [w,h]=this.floor.size;
    const fc=color(this.floor.floorColor);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const c=(x+y)%2===0?fc:Phaser.Display.Color.IntegerToColor(fc).lighten(5).color;
      this.diamond(g,x,y,1,1,c);
      if(this.floor.id==="terraco" && (x*11+y*17)%6===0){
        const p=iso(x+0.3,y+0.4);
        g.fillStyle(0x719e57,0.35).fillRect(p.x,p.y,3,2);
      }
    }
    if(this.floor.id==="refeitorio") {
      for(let x=1;x<17;x+=2) this.diamond(g,x,0.8,1,0.6,0x5e396d);
    }
  }
  private paintArchitecture() {
    const [w,h]=this.floor.size;
    const g=this.add.graphics().setDepth(-90000);
    const indoor=this.floor.id!=="terraco";
    if(indoor){
      this.box(g,{type:"wall",x:0,y:0,w,d:0.25},115,this.floor.id==="refeitorio"?0x4c2b63:0x241c36);
      this.box(g,{type:"wall",x:0,y:0,w:0.25,d:h},115,0x29203b);
    } else {
      for(let x=0;x<w;x+=2) this.box(g,{type:"fence",x,y:0,w:1.9,d:0.14},19,0x677986);
      for(let y=0;y<h;y+=2) this.box(g,{type:"fence",x:0,y,w:0.14,d:1.9},19,0x657a83);
      const sky=this.add.text(iso(10,0).x,iso(10,0).y-100,"TERRAÇO · O AR É GRÁTIS",{
        fontFamily:"'Press Start 2P'",fontSize:"9px",color:"#ade9f9",
      }).setOrigin(0.5).setDepth(-89000);
      sky.setStroke("#1b1830",4);
    }
    const sign = this.floor.name.toUpperCase() + " · " + this.floor.level.toUpperCase();
    const p=iso(w/2,0);
    this.add.text(p.x,p.y-130,sign,{fontFamily:"'Press Start 2P'",fontSize:"8px",
      color:this.floor.id==="terraco"?"#b9e0dc":"#f2d8ff"}).setOrigin(0.5).setDepth(-88500).setStroke("#160b24",3);
  }
  private paintObject(o: AnnexObject) {
    const g=this.add.graphics().setDepth(iso(o.x+o.w/2,o.y+o.d/2).y);
    const p=iso(o.x+o.w/2,o.y+o.d/2);
    let h=18, c=0x514866;
    switch(o.type){
      case "elevator": h=55;c=0x7f5ac6;break;
      case "counter": h=28;c=this.floor.id==="studio11"?0x141319:0x583b62;break;
      case "fridge": h=65;c=0xafa5ba;break;
      case "table": h=19;c=this.floor.id==="refeitorio"?0xcebcd4:0x5d4b67;break;
      case "sofa": h=20;c=this.floor.id==="terraco"?0x2d3040:0x9a4ab1;break;
      case "stage": h=12;c=0x25172e;break;
      case "seat": h=24;c=0x4b354f;break;
      case "speaker": h=44;c=0x7e2d98;break;
      case "podium": h=34;c=0x51304b;break;
      case "coffee": h=32;c=0x20202e;break;
      case "water": h=38;c=0x5493b8;break;
      case "beanbag": h=9;c=0x984abb;break;
      case "plant": h=30;c=0x48734d;break;
      case "glass": h=70;c=0x739bb4;break;
      case "desk": h=23;c=0x342c42;break;
      case "board": h=49;c=0x3b3978;break;
      case "kiosk": h=38;c=0x6c4ca0;break;
      case "printer": h=22;c=0xe0d7de;break;
      case "cabinet": h=58;c=0x4b4755;break;
      case "screen": h=59;c=0x1d2137;break;
      case "archive": h=39;c=0x867d9e;break;
      case "vault": h=68;c=0xcea649;break;
    }
    this.box(g,o,h,c);
    if(o.type==="glass")g.setAlpha(0.27);
    if(o.type==="vault") this.add.text(p.x,p.y-85,"₿ COFRE", {fontFamily:"'Press Start 2P'",fontSize:"10px",color:"#ffe6a1"}).setOrigin(0.5).setDepth(p.y+125).setStroke("#1a1226",3);
    if(o.type==="board") this.add.text(p.x,p.y-65,"METAS", {fontFamily:"'Press Start 2P'",fontSize:"7px",color:"#faedff"}).setOrigin(0.5).setDepth(p.y+40);
    if(o.type==="speaker") {
      this.add.text(p.x,p.y-57,"♪  PROFETA KPI", {fontFamily:"'Press Start 2P'",fontSize:"7px",color:"#ffd67e"}).setOrigin(0.5).setDepth(iso(o.x+o.w,o.y+o.d).y+1).setStroke("#1b1229",3);
    }
    if(o.type==="elevator")this.add.text(p.x,p.y-52,"⇵", {fontFamily:"monospace",fontSize:"22px",color:"#ecdbff"}).setOrigin(0.5).setDepth(iso(o.x+o.w,o.y+o.d).y+1);
    if(o.type==="counter" && this.floor.id==="studio11")this.add.text(p.x,p.y-35,"YAH CAFÉ", {fontFamily:"'Press Start 2P'",fontSize:"7px",color:"#f7e4ff"}).setOrigin(0.5).setDepth(iso(o.x+o.w,o.y+o.d).y+1);
    if(o.type==="plant") {
      this.add.ellipse(p.x,p.y-40,23,27,0x4d9e60).setDepth(iso(o.x+o.w,o.y+o.d).y+1);
    }
  }

  private repositionPlayer() {
    if (!this.player) return;
    const p=iso(this.px,this.py);
    this.player.setPosition(p.x,p.y);
    this.player.setDepth(p.y+1);
  }
  override update(_t:number, dtMs:number) {
    if (!this.player || !this.floor) return;
    const dt=Math.min(dtMs,50)/1000;
    const ui=game.get().ui;
    if(!ui.modal){
      const k=this.keys;
      const keyX=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown);
      const keyY=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown);
      const dir=playerMovement(keyX,keyY,this.virtualDir);
      const initialX=this.px, initialY=this.py;
      if(dir.amount){
        const sp=BALANCE.playerSpeed*dt*dir.amount;
        if(!blocked(this.px+dir.dx*sp,this.py,this.solids,0.22,...this.floor.size))this.px+=dir.dx*sp;
        if(!blocked(this.px,this.py+dir.dy*sp,this.solids,0.22,...this.floor.size))this.py+=dir.dy*sp;
        this.walk+=dt*dir.amount;
        if(keyX||this.virtualDir.sx)this.player.setFlipX(keyX+this.virtualDir.sx<0);
      } else this.walk=0;
      const traveled=Math.hypot(this.px-initialX,this.py-initialY);
      const feedback=obstructionFeedback({attempted:dir.amount,travelled:traveled,
        heldSeconds:this.blockedHeld,frameSeconds:dt,gameSeconds:this.time.now/1000,
        lastNoticeSeconds:this.lastBlockedNotice});
      this.blockedHeld=feedback.heldSeconds;
      if(feedback.notify){
        this.lastBlockedNotice=this.time.now/1000;
        game.toast("Caminho obstruído. Contorne o obstáculo.");
      }
      if(traveled>0.0001){
        this.dustTimer+=dt;
        if(this.dustTimer>=0.26){
          this.dustTimer=0;
          const point=iso(this.px,this.py);
          const dust=this.add.ellipse(point.x,point.y,10,4,0xcab2d8,0.28).setDepth(point.y);
          this.tweens.add({targets:dust,alpha:0,scaleX:1.8,scaleY:1.3,
            duration:380,onComplete:()=>dust.destroy()});
        }
      } else this.dustTimer=0;
      game.tick(dt);
    }
    this.repositionPlayer();
    const target = navigationTarget(game.get().state);
    for (const { objectId, marker, ring } of this.questMarkers) {
      const visible=target?.floor===this.floor.id && target.interaction===objectId;
      marker.setVisible(visible);
      ring?.setVisible(visible);
    }
    if(this.walk) this.player.y-=Math.abs(Math.sin(this.walk*10))*3;
    let nearest:typeof this.points[number] | null=null;
    let dMin: number = BALANCE.interactRadius;
    for(const point of this.points){
      const d=Math.hypot(point.x-this.px,point.y-this.py);
      if(d<dMin){dMin=d;nearest=point;}
    }
    if((ui.prompt?.id??null)!==(nearest?.id??null))game.setUI({prompt:nearest?{id:nearest.id,label:nearest.label}:null});
    this.posAcc+=dt;
    if(this.posAcc>=0.15){
      this.posAcc=0;
      game.setPositions({player:{x:+this.px.toFixed(2),y:+this.py.toFixed(2)},npcs:{}});
    }
  }
}
