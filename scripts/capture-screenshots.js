/**
 * Capture screenshots of all key app screens using Playwright.
 * Requires the e2e test server to be running (npm run dev:test).
 *
 * Usage: npx playwright test scripts/capture-screenshots.js --config=playwright.config.js
 *    or: node scripts/capture-screenshots.js (launches its own browser)
 */
import { chromium } from "@playwright/test";
import { resolve } from "path";

const BASE_URL = "http://localhost:3100";
const OUTPUT_DIR = resolve("docs/screenshots");

const screens = [
  { name: "dashboard", path: "/app", title: "Dashboard" },
  { name: "products", path: "/app/products", title: "Product Breakdown" },
  { name: "returns", path: "/app/returns", title: "Return Reason Analytics" },
  { name: "sync", path: "/app/sync", title: "Data Sync" },
  { name: "settings", path: "/app/settings", title: "Settings" },
];

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  for (const screen of screens) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${screen.path}`, {
      waitUntil: "networkidle",
    });
    // Wait for content to render
    await page.waitForTimeout(500);

    await page.screenshot({
      path: resolve(OUTPUT_DIR, `${screen.name}.png`),
      fullPage: true,
    });
    console.log(`Captured: ${screen.name} (${screen.title})`);
    await page.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUTPUT_DIR}/`);
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err.message);
  process.exit(1);
});
