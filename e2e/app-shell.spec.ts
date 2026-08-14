import { expect, test } from "@playwright/test";

test("loads the signed-out entry point on the default hash route", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "QuestGear" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mit Discord fortfahren" })).toBeVisible();
});

test("keeps the signed-out hash route stable across refresh", async ({ page }) => {
  await page.goto("/#/login");
  await page.reload();

  await expect(page).toHaveURL(/#\/login$/u);
  await expect(page.getByRole("heading", { name: "QuestGear" })).toBeVisible();
});

test("does not overflow horizontally at the minimum supported viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "QuestGear" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
  );

  expect(hasHorizontalOverflow).toBe(false);
});
