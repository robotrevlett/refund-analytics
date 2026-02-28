import { test, expect } from "@playwright/test";

test.describe("Sync Page", () => {
  test("loads and shows sync status", async ({ page }) => {
    await page.goto("/app/sync");

    await expect(page.getByRole("heading", { name: "Data Sync" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sync Status" })).toBeVisible();
  });

  test("shows last synced time when completed", async ({ page }) => {
    await page.goto("/app/sync");
    await expect(page.getByText("Last synced:")).toBeVisible();
  });

  test("shows re-sync button", async ({ page }) => {
    await page.goto("/app/sync");

    const button = page.getByRole("button", { name: /Re-sync Data/i });
    await expect(button).toBeVisible();
  });
});
