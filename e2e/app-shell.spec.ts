import { expect, test } from "@playwright/test";

test("loads the app shell on the default hash route", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Startseite" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  await expect(page.getByLabel("Sprache")).toHaveValue("de");
});
