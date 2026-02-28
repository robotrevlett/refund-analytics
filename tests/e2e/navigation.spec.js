import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("can navigate between all pages", async ({ page }) => {
    // Start at dashboard
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();

    // Navigate to products
    await page.goto("/app/products");
    await expect(page.getByRole("heading", { name: "Product Refund Breakdown" })).toBeVisible();

    // Navigate to returns
    await page.goto("/app/returns");
    await expect(page.getByRole("heading", { name: "Return Reason Analytics" })).toBeVisible();

    // Navigate to sync
    await page.goto("/app/sync");
    await expect(page.getByRole("heading", { name: "Data Sync" })).toBeVisible();

    // Navigate to settings
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
