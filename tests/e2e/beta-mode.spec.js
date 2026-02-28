import { test, expect } from "@playwright/test";

test.describe("Beta Mode", () => {
  test("BetaBanner is visible on dashboard", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText(/early tester/i)).toBeVisible();
    await expect(page.getByText(/share your thoughts/i)).toBeVisible();
  });

  test("BetaBanner can be dismissed and stays dismissed on reload", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText(/early tester/i)).toBeVisible();

    // Dismiss the banner (Polaris Banner close button)
    const banner = page.locator('[class*="Banner"]').filter({ hasText: /early tester/i });
    const dismissButton = banner.getByRole("button");
    await dismissButton.click();

    await expect(page.getByText(/early tester/i)).not.toBeVisible();

    // Reload — banner should stay dismissed (localStorage persistence)
    await page.reload();
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
    await expect(page.getByText(/early tester/i)).not.toBeVisible();
  });

  test("all features accessible without billing (returns page loads)", async ({ page }) => {
    // In beta mode, returns page should load fully — no Pro plan gate
    await page.goto("/app/returns");
    await expect(page.getByRole("heading", { name: "Return Reason Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reason Breakdown" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reason Trends Over Time" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Return Reasons by Product" })).toBeVisible();

    // Confirm Pro plan gate banner is NOT shown
    await expect(page.getByText(/Pro Plan Required/i)).not.toBeVisible();
  });
});

test.describe("Review Prompt", () => {
  test("shows after 14 days of app usage", async ({ page }) => {
    // Seed sets installedAt to 15 days ago, so prompt should appear
    await page.goto("/app");
    await expect(page.getByText(/enjoying refund analytics/i)).toBeVisible();
    await expect(page.getByText(/leave a review/i)).toBeVisible();
  });

  test("can be dismissed and tracks dismissal count", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText(/enjoying refund analytics/i)).toBeVisible();

    // Dismiss the review prompt
    const banner = page.locator('[class*="Banner"]').filter({ hasText: /enjoying/i });
    const dismissButton = banner.getByRole("button");
    await dismissButton.click();

    await expect(page.getByText(/enjoying refund analytics/i)).not.toBeVisible();

    // Reload — prompt reappears (only 1 of 3 max dismissals used)
    await page.reload();
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
    await expect(page.getByText(/enjoying refund analytics/i)).toBeVisible();
  });

  test("stops showing after 3 dismissals", async ({ page }) => {
    await page.goto("/app");

    // Dismiss 3 times
    for (let i = 0; i < 3; i++) {
      await expect(page.getByText(/enjoying refund analytics/i)).toBeVisible();
      const banner = page.locator('[class*="Banner"]').filter({ hasText: /enjoying/i });
      await banner.getByRole("button").click();
      await expect(page.getByText(/enjoying refund analytics/i)).not.toBeVisible();

      if (i < 2) {
        await page.reload();
        await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
      }
    }

    // After 3rd dismissal, reload should NOT show the prompt
    await page.reload();
    await expect(page.getByRole("heading", { name: "Refund & Return Analytics" })).toBeVisible();
    await expect(page.getByText(/enjoying refund analytics/i)).not.toBeVisible();
  });
});
