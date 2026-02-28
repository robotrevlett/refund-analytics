/**
 * E2E test server setup script.
 * Prepares the database and starts the Remix dev server with mock auth.
 *
 * Usage: node tests/e2e/test-server.js
 */
import { execSync } from "child_process";
import { resolve } from "path";
import { seedE2EData } from "./seed.js";

const DB_PATH = resolve("prisma/e2e-test.db");

// Set up environment
process.env.DATABASE_URL = `file:${DB_PATH}`;
process.env.E2E_TEST = "1";
process.env.PORT = process.env.PORT || "3100";
process.env.SHOPIFY_API_KEY = "test-api-key";
process.env.SHOPIFY_API_SECRET = "test-api-secret";
process.env.SHOPIFY_APP_URL = `http://localhost:${process.env.PORT}`;
process.env.SCOPES = "read_orders";

console.log("Setting up e2e test database...");
execSync("npx prisma migrate deploy", {
  env: { ...process.env },
  stdio: "pipe",
});

console.log("Seeding e2e test data...");
await seedE2EData();

console.log("Starting dev server...");
// Hand off to Remix dev server
execSync(`npx remix vite:dev --port ${process.env.PORT}`, {
  env: { ...process.env },
  stdio: "inherit",
});
