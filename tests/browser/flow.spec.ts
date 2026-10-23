import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const demo = JSON.parse(readFileSync(".local-demo.json", "utf8"));
test("student desktop + tablet dashboard, completion, reward and session persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("E-posta", { exact: true }).fill(demo.student.email);
  await page
    .getByLabel("Parola (en az 8 karakter)")
    .fill(demo.student.password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(
    page.getByRole("heading", { name: "Merhaba, Zeynep ☀️" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/studycoach-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Matematik — 20 soru: tamamla", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Matematik — 20 soru: geri al",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Matematik — 20 soru: geri al",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Matematik — 20 soru: geri al", exact: true })
    .click();
  await page.getByRole("link", { name: "Haftalık plan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Haftalık plan", exact: true }),
  ).toBeVisible();
  if (await page.getByRole("button", { name: "Başla", exact: true }).count())
    await page
      .getByRole("button", { name: "Başla", exact: true })
      .first()
      .click();
  else if (
    await page.getByRole("button", { name: "Devam et", exact: true }).count()
  )
    await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Duraklat", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Duraklat", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Devam et", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Devam et", exact: true }).click();
  await page.getByRole("link", { name: "Bugün", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Merhaba, Zeynep ☀️" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: "/tmp/studycoach-tablet.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
});
test("parent management and student isolation", async ({ page }) => {
  const title = "Tarayıcı test görevi " + Date.now();
  await page.goto("/");
  await page.getByLabel("E-posta", { exact: true }).fill(demo.parent.email);
  await page.getByLabel("Parola (en az 8 karakter)").fill(demo.parent.password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.getByRole("link", { name: "Ebeveyn paneli", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Haftalık özet", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Görev yönetimi" }).click();
  await page.getByText("Yeni görev / ödev ekle", { exact: true }).click();
  await page.getByLabel("Başlık", { exact: true }).first().fill(title);
  await page.getByRole("button", { name: "Görevi kaydet" }).click();
  await page.getByRole("link", { name: "Görevler", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
});

test("reward request stays pending until parent approves and calendar opens", async ({
  page,
}) => {
  async function login(account: { email: string; password: string }) {
    await page.goto("/");
    await page.getByLabel("E-posta", { exact: true }).fill(account.email);
    await page.getByLabel("Parola (en az 8 karakter)").fill(account.password);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(
      page.getByRole("heading", { name: "Merhaba, Zeynep ☀️" }),
    ).toBeVisible();
  }
  await login(demo.parent);
  await page.getByRole("link", { name: "Ebeveyn paneli", exact: true }).click();
  await page.getByRole("combobox", { name: /Birim/ }).selectOption("COIN");
  await page.getByLabel("Tutar (+ / −)", { exact: true }).fill("100");
  await page
    .getByLabel("Açıklama (zorunlu)", { exact: true })
    .fill("Tarayıcı ödül testi");
  await page.getByRole("button", { name: "Düzeltmeyi kaydet" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page
    .getByRole("button", { name: "Çıkış yap" })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  await login(demo.student);
  await page.getByRole("link", { name: "Ödül mağazası", exact: true }).click();
  await page.getByRole("button", { name: "Ödül talep et" }).first().click();
  await expect(
    page.getByText("40 Coin · Bekliyor", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Takvim", exact: true }).click();
  await expect(
    page.getByText("📚 Ödev teslimi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Çıkış yap" })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  await login(demo.parent);
  await page.getByRole("link", { name: "Ödül mağazası", exact: true }).click();
  await page
    .getByRole("button", { name: "Onayla", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("40 Coin · Onaylandı", { exact: true }).first(),
  ).toBeVisible();
});

test("PWA shell uses a public offline screen without caching student pages", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const paths = await page.evaluate(async () => {
    const cache = await caches.open("studycoach-shell-v1");
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });
  expect(paths.sort()).toEqual([
    "/icon-192.png",
    "/icon-512.png",
    "/offline.html",
  ]);
  await context.setOffline(true);
  await page.goto("/offline-check");
  await expect(
    page.getByRole("heading", { name: "Biraz bağlantı molası." }),
  ).toBeVisible();
  await context.setOffline(false);
});
