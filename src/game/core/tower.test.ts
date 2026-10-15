import { describe, expect, it } from "vitest";
import { newGame, applyEffects, tickClock, sickLeave, QUESTS } from "./logic";
import { canVisit, arrivalPoint, FLOORS, floorDefinition } from "./floors";
import { navigationTarget, floorHasMission } from "./wayfinding";
import { blocked } from "./world";
import { performPyramidAction } from "./pyramid";

// Geometry-level confidence tests for access to interactables.
// These cannot replace visual/device playtests.
describe("full office tower", () => {
  it("registers nine distinct navigable floors", () => {
    expect(FLOORS).toHaveLength(9);
    expect(new Set(FLOORS.map(f => f.id)).size).toBe(FLOORS.length);
  });

  it.each(FLOORS)("has a valid landing point for $name", ({id}) => {
    const landing = arrivalPoint(id);
    expect(Number.isFinite(landing.x) && Number.isFinite(landing.y)).toBe(true);
    if(id!=="office") {
      const floor = floorDefinition(id)!;
      expect(blocked(landing.x,landing.y,floor.decor,0.22,...floor.size)).toBe(false);
    }
  });

  it.each(FLOORS.filter(f=>f.id!=="office"))("has reachable interaction points on $name", ({id}) => {
    const floor = floorDefinition(id)!;
    const [w,h] = floor.size;
    const step=.4;
    const cells=new Set<string>();
    const queue: [number,number][]=[];
    const src=arrivalPoint(id);
    const key=(x:number,y:number)=>x+":"+y;
    const push=(x:number,y:number) => {
      const k=key(x,y);
      if(cells.has(k)||queue.length>10000||blocked(x*step,y*step,floor.decor,.22,w,h)) return;
      cells.add(k);queue.push([x,y]);
    };
    push(Math.round(src.x/step),Math.round(src.y/step));
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i]!;
      push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);
    }
    expect(queue.length).toBeGreaterThan(100);
    for(const point of floor.decor.filter(o=>o.id)) {
      const x=point.ix??point.x+point.w/2;
      const y=point.iy??point.y+point.d+.5;
      const accessible=queue.some(([xx,yy])=>Math.hypot(xx*step-x,yy*step-y)<1.49);
      expect(accessible, floor.id+" interaction "+point.id).toBe(true);
    }
  });

  it("limits new floor access to its required rank", () => {
    const s=newGame();
    for(const def of FLOORS) {
      if(def.id==="studio11")continue;
      expect(canVisit(s,def.id)).toBe(def.minRank===0);
    }
    for(const rank of [1,2,3,4,5]) {
      s.pyramid.rank=rank;
      for(const f of FLOORS) expect(canVisit(s,f.id)).toBe(f.minRank<=rank);
    }
  });

  it("denies access after final outcomes", () => {
    const s=newGame();s.pyramid.outcome="bankrupt";
    expect(canVisit(s,"portaria")).toBe(false);
  });
});

describe("five new mission chains", () => {
  const steps=[
    ["credencial","portaria",["register","badge"]],
    ["campanha","criativo",["read","print"]],
    ["auditoria","compliance",["review","file"]],
    ["conselho","diretoria",["meet","sign"]],
    ["tesouro","tesouraria",["check"]],
  ] as const;
  it.each(steps)("completes $0 in its own map without double rewards", (id,floor,objectives) => {
    let s=applyEffects(newGame(),{startQuest:id}).state;
    expect(navigationTarget(s)?.floor).toBe(floor);
    expect(floorHasMission(s,floor)).toBe(true);
    for(const objective of objectives) s=applyEffects(s,{advance:[{quest:id,objective}]}).state;
    expect(s.quests[id].status).toBe("completed");
    const influence=s.pyramid.influence;
    const cleanMoney=s.stats.limpo;
    const s2=applyEffects(s,{advance:[{quest:id,objective:objectives.at(-1)!}]}).state;
    expect(s2.pyramid.influence).toBe(influence);
    expect(s2.stats.limpo).toBe(cleanMoney);
  });
  it.each(steps)("tracks objective order on $0", (id,floor,objectives) => {
    let s=applyEffects(newGame(),{startQuest:id}).state;
    const last=objectives.at(-1)!;
    if(objectives.length>1){
      s=applyEffects(s,{advance:[{quest:id,objective:last}]}).state;
      expect(s.quests[id].step).toBe(0);
    }
    expect(navigationTarget(s)?.floor).toBe(floor);
  });

  it("maps every quest objective to a destination", () => {
    for(const q of QUESTS) {
      let s=applyEffects(newGame(),{startQuest:q.id}).state;
      for(const o of q.objectives){
        expect(navigationTarget(s)?.interaction, q.id+":"+o.id).toBeTruthy();
        s=applyEffects(s,{advance:[{quest:q.id,objective:o.id}]}).state;
      }
    }
  });
});

describe("clock, crisis and withdrawals", () => {
  it("carries minutes across two days and pays two salaries", () => {
    const s=newGame();const result=tickClock(s,1100).state;
    expect(result.clock.day).toBe(3);
    expect(result.clock.minutes).toBe(560);
    expect(result.stats.limpo).toBe(300);
    expect(result.pyramid.heat).toBe(24);
  });
  it("advances fiscal pressure when returning from sick leave", () => {
    const s=newGame();const next=sickLeave(s);
    expect(next.pyramid.heat).toBeGreaterThan(s.pyramid.heat);
    expect(next.clock.day).toBe(2);
  });
  it("stops time at the fictional bankruptcy deadline", () => {
    const s=newGame();const future=tickClock(s,2000).state;
    expect(future.pyramid.outcome).toBe("bankrupt");
    expect(future.clock.day).toBe(4);
  });
  it("cannot cash out an empty wallet", () => {
    const s=newGame();expect(performPyramidAction(s,"withdraw").ok).toBe(false);
  });
  it("does not mutate pre-action character state", () => {
    const s=newGame();const oldHeat=s.pyramid.heat;
    const result=performPyramidAction(s,"pitch");
    expect(result.ok).toBe(true);
    expect(s.pyramid.heat).toBe(oldHeat);
  });
});
