import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server.js";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: "2026-01",
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

/**
 * E2E test mock: bypass Shopify auth and return a fake admin context.
 * Only active when E2E_TEST env var is set. Never in production.
 */
function createTestAuth() {
  const testShop = "test-store.myshopify.com";
  const mockAdmin = {
    graphql: async () => ({
      json: async () => ({ data: { shop: { currencyCode: "USD" } } }),
    }),
  };
  const mockSession = { shop: testShop, accessToken: "test-token" };

  return {
    admin: async () => ({ admin: mockAdmin, session: mockSession }),
    webhook: async (request) => ({
      topic: request.headers.get("x-shopify-topic") || "UNKNOWN",
      shop: testShop,
      payload: {},
      admin: mockAdmin,
    }),
  };
}

const isE2ETest = process.env.E2E_TEST === "1";

export default shopify;
export const apiVersion = "2026-01";
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = isE2ETest ? createTestAuth() : shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
