import { test, expect } from "@playwright/test";

test.describe("Return Reasons Page", () => {
  test("loads and shows reason breakdown", async ({ page }) => {
    await page.goto("/app/returns");

    await expect(page.getByRole("heading", { name: "Return Reason Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reason Breakdown" })).toBeVisible();
  });

  test("shows reason trends section", async ({ page }) => {
    await page.goto("/app/returns");
    await expect(page.getByRole("heading", { name: "Reason Trends Over Time" })).toBeVisible();
  });

  test("shows reasons by product section", async ({ page }) => {
    await page.goto("/app/returns");
    await expect(page.getByRole("heading", { name: "Return Reasons by Product" })).toBeVisible();
  });
});
