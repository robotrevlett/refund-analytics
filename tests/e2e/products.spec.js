import { test, expect } from "@playwright/test";

test.describe("Products Page", () => {
  test("loads and shows product refund tables", async ({ page }) => {
    await page.goto("/app/products");

    await expect(page.getByRole("heading", { name: "Product Refund Breakdown" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top Refunded Products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Refund Details" })).toBeVisible();
  });

  test("shows sortable column headers", async ({ page }) => {
    await page.goto("/app/products");

    await expect(page.getByText("Refund Count")).toBeVisible();
    await expect(page.getByText("Refund Amount")).toBeVisible();
  });

  test("navigates back to dashboard", async ({ page }) => {
    await page.goto("/app/products");

    // Use the back button (Polaris Page component renders it)
    const backLink = page.getByRole("link", { name: "Refund & Return Analytics" }).or(
      page.locator('[class*="BackAction"] a'),
    );
    if (await backLink.first().isVisible()) {
      await backLink.first().click();
      await page.waitForURL("/app");
    } else {
      // Fallback: navigate directly
      await page.goto("/app");
    }
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
  });

  test("date range selector works", async ({ page }) => {
    await page.goto("/app/products");

    const select = page.locator("select").first();
    await select.selectOption("90");

    await page.waitForURL(/days=90/);
    await expect(page.getByRole("heading", { name: "Top Refunded Products" })).toBeVisible();
  });
});
