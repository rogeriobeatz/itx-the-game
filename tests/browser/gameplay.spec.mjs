import { expect, test } from "@playwright/test";

async function startNew(page, avatar) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "INTERGALATIC" })).toBeVisible({timeout:30000});
  await page.getByRole("button", { name: "JOGAR" }).click();
  await expect(page.getByText("QUEM COMEÇA O EXPEDIENTE?")).toBeVisible();
  await page.getByRole("button", { name: avatar }).click();
  await page.getByRole("button", { name: "COMEÇAR O EXPEDIENTE" }).click();
  await expect(page.locator(".title-screen")).toHaveCount(0);
  await expect(page.getByText("Registrar entrada no totem da portaria").first()).toBeVisible();
}

test("desktop: avatar, first objective and uncomplicated elevator", async ({page}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await startNew(page, "MULHER");
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
