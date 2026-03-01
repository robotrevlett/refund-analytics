import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";
import { syncSubscriptionStatus } from "../models/billing.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const isBeta = process.env.BETA_MODE === "1";

  // Ensure shop record exists with correct currency (fetched from Shopify)
  const existing = await db.shop.findUnique({ where: { id: shop } });
  if (!existing) {
    try {
      const response = await admin.graphql(`#graphql
        query { shop { currencyCode } }
      `);
      const { data } = await response.json();
      const currency = data?.shop?.currencyCode || "USD";
      await db.shop.create({
        data: { id: shop, currency, syncStatus: "pending" },
      });
    } catch {
      // Non-critical — shop record will be created during first sync
    }
  }

  // In beta mode, all features are free — skip billing check
  let planName = "Pro";
  if (!isBeta && process.env.E2E_TEST !== "1") {
    try {
      const result = await syncSubscriptionStatus(admin, shop);
      planName = result.planName;
    } catch {
      // Non-critical — planName stays null if sync fails
      planName = null;
    }
  }

  // Load installedAt for review prompt timing
  const shopRecord = await db.shop.findUnique({ where: { id: shop }, select: { installedAt: true } });
  const installedAt = shopRecord?.installedAt?.toISOString() || null;

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", planName, isBeta, installedAt });
};

export default function App() {
  const { apiKey, planName, isBeta, installedAt } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ui-nav-menu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/products">Products</Link>
        <Link to="/app/returns">Return Reasons</Link>
        <Link to="/app/sync">Data Sync</Link>
        <Link to="/app/settings">Settings</Link>
      </ui-nav-menu>
      <Outlet context={{ planName, isBeta, installedAt }} />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
