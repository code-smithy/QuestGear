import { expect, test } from "@playwright/test";

test("loads the signed-out entry point on the default hash route", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "QuestGear" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mit Discord fortfahren" })).toBeVisible();
});
