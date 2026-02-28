import { test, expect } from "@playwright/test";

test.describe("Legal Pages", () => {
  test("public privacy policy loads without auth", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "Refund & Return Analytics" })).toBeVisible();
  });

  test("public terms of service loads without auth", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("in-app privacy policy loads", async ({ page }) => {
    await page.goto("/app/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText("Data We Collect", { exact: true })).toBeVisible();
  });

  test("in-app terms of service loads", async ({ page }) => {
    await page.goto("/app/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("settings page links to legal pages", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Legal" })).toBeVisible();
  });
});
