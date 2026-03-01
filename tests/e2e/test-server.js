/**
 * E2E test server setup script.
 * Prepares the database and starts the React Router dev server with mock auth.
 *
 * Usage: node tests/e2e/test-server.js
 */
import { execSync } from "child_process";
import { seedE2EData } from "./seed.js";

// Set up environment — uses Neon test branch (or local Postgres)
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set. Point it at your Neon test branch or local Postgres.");
  process.exit(1);
}
process.env.E2E_TEST = "1";
process.env.BETA_MODE = "1";
process.env.PORT = process.env.PORT || "3100";
process.env.SHOPIFY_API_KEY = "test-api-key";
process.env.SHOPIFY_API_SECRET = "test-api-secret";
process.env.SHOPIFY_APP_URL = `http://localhost:${process.env.PORT}`;
process.env.SCOPES = "read_orders";

console.log("Seeding e2e test data...");
await seedE2EData();

console.log("Starting dev server...");
// Hand off to React Router dev server
execSync(`npx react-router dev --port ${process.env.PORT}`, {
  env: { ...process.env },
  stdio: "inherit",
});
