import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useOutletContext } from "@remix-run/react";
import { useCallback } from "react";
import { authenticate } from "../shopify.server.js";
import {
  getReturnReasonBreakdown,
  getReturnReasonTrend,
  getReturnReasonsByProduct,
} from "../models/return-reason.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import { parseDays } from "../utils.server.js";
import { DateRangeSelector } from "../components/DateRangeSelector.jsx";
import { AppBanners } from "../components/AppBanners.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseDays(url.searchParams);

  const [reasonBreakdown, reasonTrend, productReasons, syncStatus] = await Promise.all([
    getReturnReasonBreakdown(shop, days),
    getReturnReasonTrend(shop, days),
    getReturnReasonsByProduct(shop, days),
    getShopSyncStatus(shop),
  ]);

  return json({ reasonBreakdown, reasonTrend, productReasons, days, syncStatus });
};

function SimpleTable({ headings, rows, columnContentTypes }) {
  if (!rows || rows.length === 0) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {headings.map((h, i) => (
            <th
              key={i}
              style={{
                textAlign: columnContentTypes?.[i] === "numeric" ? "right" : "left",
                padding: "8px",
                borderBottom: "1px solid var(--p-color-border)",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                style={{
                  textAlign: columnContentTypes?.[ci] === "numeric" ? "right" : "left",
                  padding: "8px",
                  borderBottom: "1px solid var(--p-color-border)",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ReturnsPage() {
  const { reasonBreakdown, reasonTrend, productReasons, days, syncStatus } = useLoaderData();
  const navigate = useNavigate();
  const { planName, isBeta } = useOutletContext() || {};

  const handleDaysChange = useCallback((value) => {
    navigate(`/app/returns?days=${value}`);
  }, [navigate]);

  if (!isBeta && planName !== "Pro") {
    return (
      <>
        <AppBanners />
        <s-page title="Return Reason Analytics" back-action-url="/app">
          <s-banner title="Pro Plan Required" tone="warning">
            <p>Return Reason Analytics is available on the Pro plan. Upgrade in the Shopify admin to access detailed return reason tracking.</p>
          </s-banner>
        </s-page>
      </>
    );
  }

  return (
    <>
      <AppBanners />
      <s-page title="Return Reason Analytics" back-action-url="/app">
        <s-stack gap="500">
        {syncStatus.status === "pending" && reasonBreakdown.length === 0 ? (
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">No return reason data</s-text>
              <p>Sync your Shopify orders to see return reason analytics.</p>
              <s-button
                ref={(el) => {
                  if (el) el.addEventListener("click", () => navigate("/app/sync"));
                }}
              >
                Sync order data
              </s-button>
            </s-stack>
          </s-section>
        ) : (
        <>
        <s-box padding-inline-end="300">
          <s-grid columns="1fr auto" align-items="center">
            <s-text variant="headingMd" as="h2">Return Reasons</s-text>
            <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
          </s-grid>
        </s-box>

        <s-stack gap="500">
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">
                Reason Breakdown
              </s-text>
              {reasonBreakdown.length > 0 ? (
                <SimpleTable
                  columnContentTypes={["text", "text", "numeric", "numeric"]}
                  headings={["Reason", "Category", "Count", "Items Returned"]}
                  rows={reasonBreakdown.map((r) => [
                    r.reason,
                    r.category,
                    r.count,
                    r.quantity,
                  ])}
                />
              ) : (
                <s-text tone="subdued">
                  No return reason data for this period. Return reasons require
                  Shopify's structured return reasons feature (Jan 2026+).
                </s-text>
              )}
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">
                Reason Trends Over Time
              </s-text>
              {reasonTrend.length > 0 ? (
                <SimpleTable
                  columnContentTypes={["text", "text", "numeric", "numeric"]}
                  headings={["Date", "Reason", "Count", "Qty Returned"]}
                  rows={reasonTrend.map((r) => [
                    r.date,
                    r.reason,
                    r.count,
                    r.quantity,
                  ])}
                />
              ) : (
                <s-text tone="subdued">No trend data for this period.</s-text>
              )}
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">
                Return Reasons by Product
              </s-text>
              {productReasons.length > 0 ? (
                <SimpleTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "numeric",
                    "numeric",
                  ]}
                  headings={[
                    "Product",
                    "SKU",
                    "Reason",
                    "Count",
                    "Qty Returned",
                  ]}
                  rows={productReasons.map((r) => [
                    r.product,
                    r.sku,
                    r.reason,
                    r.count,
                    r.quantity,
                  ])}
                />
              ) : (
                <s-text tone="subdued">No return reason data for this period.</s-text>
              )}
            </s-stack>
          </s-section>
        </s-stack>
        </>
        )}
        </s-stack>
      </s-page>
    </>
  );
}
