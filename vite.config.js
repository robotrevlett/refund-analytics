import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the host and port placeholders during startup with the actual HMR server values.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL.includes("localhost"))
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
}

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 64999,
    },
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    // Exclude Remix plugin during tests — it blocks .server.js imports
    ...(!isTest
      ? [
          remix({
            ignoredRouteFiles: ["**/.*"],
          }),
        ]
      : []),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    // Serialize test files to share a single Prisma client cleanly
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    // Set DATABASE_URL before modules load so db.server.js can initialize
    // Points to Neon test branch (or local Postgres for offline dev)
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/refund_analytics_test",
    },
  },
});
