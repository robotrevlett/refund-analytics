import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("loads and shows store info", async ({ page }) => {
    await page.goto("/app/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Store Info" })).toBeVisible();
    await expect(page.getByText("test-store.myshopify.com")).toBeVisible();
  });

  test("shows data summary counts", async ({ page }) => {
    await page.goto("/app/settings");

    await expect(page.getByRole("heading", { name: "Data Summary" })).toBeVisible();
    await expect(page.getByText("Orders tracked")).toBeVisible();
    await expect(page.getByText("Refunds tracked")).toBeVisible();
    await expect(page.getByText("Return reasons tracked")).toBeVisible();
  });

  test("shows about section", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(
      page.getByText("real revenue after refunds", { exact: false }),
    ).toBeVisible();
  });
});
