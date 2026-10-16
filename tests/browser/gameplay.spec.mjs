import { expect, test } from "@playwright/test";

async function startNew(page, avatar) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "INTERGALATIC" })).toBeVisible({timeout:30000});
  await page.getByRole("button", { name: "JOGAR" }).click();
  await expect(page.getByText("QUEM COMEÇA O EXPEDIENTE?")).toBeVisible();
  await page.getByRole("button", { name: avatar }).click();
  await page.getByRole("button", { name: "COMEÇAR O EXPEDIENTE" }).click();
  await expect(page.locator(".title-screen")).toHaveCount(0);
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".mobile-hud-objective-text:visible, .quest-obj:visible").filter({ hasText: "Fale com a recepção e registre sua entrada no totem" }).first()).toBeVisible();
}

test("desktop: avatar, first objective and uncomplicated elevator", async ({page}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await startNew(page, "MULHER");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("CANVAS");
  await page.keyboard.press("l");
  await expect(page.getByRole("heading", {name:"ESCOLHA O ANDAR"})).toBeVisible();
  await expect(page.getByText("ANDARES DISPONÍVEIS")).toBeVisible();
  await expect(page.getByText("Portaria & Credenciamento").first()).toBeVisible();
  await page.screenshot({path:"test-results/desktop-elevator.png"});
  await page.getByRole("button", {name:/Refeitório/i}).click();
  await expect(page.getByText("Refeitório", {exact:false}).first()).toBeVisible();
  await page.screenshot({path:"test-results/desktop-refeitorio.png"});
});

test("mobile: minimal HUD, fully hidden idle stick, drag and accessible elevator", async ({browser}) => {
  const ctx = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page = await ctx.newPage();
  await startNew(page, "HOMEM");
  await expect(page.locator(".mobile-hud")).toBeVisible();
  await expect(page.locator(".hud-tl")).toBeHidden();
  await expect(page.locator(".hud-tr")).toBeHidden();
  await expect(page.locator(".hud-bl")).toBeHidden();
  await expect(page.locator(".hud-br")).toBeHidden();
  await expect(page.locator(".touch-joystick-base")).toHaveCount(0);
  await page.screenshot({path:"test-results/mobile-idle.png"});
  const zone = await page.locator(".touch-joystick-zone").boundingBox();
  expect(zone).not.toBeNull();
  await page.mouse.move(zone.x + 80, zone.y + zone.height*.62);
  await page.mouse.down();
  await expect(page.locator(".touch-joystick-base")).toHaveCount(1);
  await page.mouse.move(zone.x + 124, zone.y + zone.height*.59, {steps:8});
  await page.screenshot({path:"test-results/mobile-drag.png"});
  await page.mouse.up();
  await expect(page.locator(".touch-joystick-base")).toHaveCount(0);
  await page.getByRole("button", {name:"Abrir menu"}).click();
  await expect(page.getByRole("heading", {name:"MENU DO JOGO"})).toBeVisible();
  await page.getByRole("button",{name:/ANDARES/}).last().click();
  await expect(page.getByRole("heading",{name:"ESCOLHA O ANDAR"})).toBeVisible();
  await page.screenshot({path:"test-results/mobile-elevator.png"});
  await ctx.close();
});

/**
 * Exercise both interactions against the real Phaser scene and HUD. We reposition
 * the saved avatar solely to avoid making the smoke test dependent on pathfinding
 * or keyboard timing; movement is covered by separate input tests.
 */
test("first day: reception completes step one, badge finishes grace period", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await startNew(page, "MULHER");

  const teleportSavedPlayer = async (x, y) => {
    await page.evaluate(({ x, y }) => {
      const raw = localStorage.getItem("intergalatic-save-v1");
      if (!raw) throw new Error("No save was created");
      const saved = JSON.parse(raw);
      saved.floor = "portaria";
      saved.pos = { x, y };
      localStorage.setItem("intergalatic-save-v1", JSON.stringify(saved));
    }, { x, y });
    await page.reload();
    await page.getByRole("button", { name: "CONTINUAR" }).click();
    await expect(page.locator(".title-screen")).toHaveCount(0);
  };

  await teleportSavedPlayer(3.65, 5.95);
  await expect(page.locator(".prompt-hint")).toContainText("recepção");
  await page.keyboard.press("e");
  await expect(page.locator(".quest-obj:visible").first()).toContainText("Passo 2/2: Retire o crachá no balcão de segurança");
  const afterReception = await page.evaluate(() => JSON.parse(localStorage.getItem("intergalatic-save-v1")));
  expect(afterReception.isGracePeriod).toBe(true);
  expect(afterReception.clock.minutes).toBe(540);
  expect(afterReception.stats.fe).toBe(70);
  expect(afterReception.stats.burnout).toBe(10);

  await teleportSavedPlayer(15.15, 5.4);
  await expect(page.locator(".prompt-hint")).toContainText("crachá");
  await page.keyboard.press("e");
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("intergalatic-save-v1"));
    return saved.quests.credencial.status;
  })).toBe("completed");
  const afterBadge = await page.evaluate(() => JSON.parse(localStorage.getItem("intergalatic-save-v1")));
  expect(afterBadge.quests.credencial.status).toBe("completed");
  expect(afterBadge.isGracePeriod).toBe(false);
  expect(afterBadge.clock.minutes).toBe(540);
  expect(afterBadge.inventory).toContain("cracha");
});
