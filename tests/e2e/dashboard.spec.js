import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads and shows KPI cards", async ({ page }) => {
    await page.goto("/app");

    // Page title (use heading role to avoid strict mode with nav/visually-hidden)
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();

    // 4 KPI card labels
    await expect(page.getByText("Gross Sales")).toBeVisible();
    await expect(page.getByText("Total Refunds")).toBeVisible();
    await expect(page.getByText("Net Revenue")).toBeVisible();
    await expect(page.getByText("Refund Rate")).toBeVisible();
  });

  test("shows refund trend section", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Refund Trend" })).toBeVisible();
  });

  test("shows top refunded products", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Top Refunded Products" })).toBeVisible();
  });

  test("shows return reasons panel", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Return Reasons" })).toBeVisible();
  });

  test("date range selector changes data", async ({ page }) => {
    await page.goto("/app");

    const select = page.locator("select").first();
    await select.selectOption("7");

    await page.waitForURL(/days=7/);
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
  });

  test("custom date range works", async ({ page }) => {
    await page.goto("/app");

    const select = page.locator("select").first();
    await select.selectOption("custom");

    const input = page.locator('input[type="number"]');
    await expect(input).toBeVisible();

    await input.fill("45");
    await input.blur();

    await page.waitForURL(/days=45/);
  });
});
