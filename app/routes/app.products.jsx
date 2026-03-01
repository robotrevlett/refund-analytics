import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useCallback, useState } from "react";
import { authenticate } from "../shopify.server.js";
import { getProductRefunds, getTopRefundedProducts } from "../models/refund.server.js";
import { getReturnReasonsByProduct } from "../models/return-reason.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import { parseDays, getShopCurrency } from "../utils.server.js";
import { DateRangeSelector } from "../components/DateRangeSelector.jsx";
import { useCurrencyFormatter } from "../components/useCurrencyFormatter.js";
import { AppBanners } from "../components/AppBanners.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseDays(url.searchParams);

  const [topProducts, productRefunds, productReasons, currency, syncStatus] = await Promise.all([
    getTopRefundedProducts(shop, days, 50),
    getProductRefunds(shop, days),
    getReturnReasonsByProduct(shop, days),
    getShopCurrency(shop),
    getShopSyncStatus(shop),
  ]);

  return json({ topProducts, productRefunds, productReasons, days, currency, syncStatus });
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

export default function ProductsPage() {
  const { topProducts, productRefunds, productReasons, days, currency, syncStatus } = useLoaderData();
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter(currency);

  const handleDaysChange = useCallback((value) => {
    navigate(`/app/products?days=${value}`);
  }, [navigate]);

  // Sortable top products table
  const [sortIndex, setSortIndex] = useState(2); // default sort by amount
  const [sortDirection, setSortDirection] = useState("descending");

  const sortedProducts = [...topProducts].sort((a, b) => {
    const fields = [null, "count", "amount"];
    const field = fields[sortIndex];
    if (!field) return 0;
    const diff = a[field] - b[field];
    return sortDirection === "ascending" ? diff : -diff;
  });

  const handleSort = useCallback((index, direction) => {
    setSortIndex(index);
    setSortDirection(direction);
  }, []);

  return (
    <>
      <AppBanners />
      <s-page title="Product Refund Breakdown" back-action-url="/app">
        <s-stack gap="500">
        {syncStatus.status === "pending" && topProducts.length === 0 ? (
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">No product refund data</s-text>
              <p>Sync your Shopify orders to see product-level refund breakdowns.</p>
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
            <s-text variant="headingMd" as="h2">By Product</s-text>
            <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
          </s-grid>
        </s-box>

        <s-stack gap="500">
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">
                Top Refunded Products
              </s-text>
              {sortedProducts.length > 0 ? (
                <SimpleTable
                  columnContentTypes={["text", "numeric", "numeric"]}
                  headings={["Product", "Refund Count", "Refund Amount"]}
                  rows={sortedProducts.map((p) => [
                    p.sku ? `${p.title} (${p.sku})` : p.title,
                    p.count,
                    formatCurrency(p.amount),
                  ])}
                />
              ) : (
                <s-text tone="subdued">No refund data for this period.</s-text>
              )}
            </s-stack>
          </s-section>

          {productReasons.length > 0 && (
            <s-section>
              <s-stack gap="400">
                <s-text variant="headingMd" as="h2">
                  Return Reasons by Product
                </s-text>
                <SimpleTable
                  columnContentTypes={["text", "text", "text", "numeric"]}
                  headings={["Product", "SKU", "Reason", "Quantity"]}
                  rows={productReasons.map((r) => [
                    r.product,
                    r.sku,
                    r.reason,
                    r.quantity,
                  ])}
                />
              </s-stack>
            </s-section>
          )}

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">
                Refund Details
              </s-text>
              {productRefunds.length > 0 ? (
                <SimpleTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "numeric",
                    "numeric",
                    "text",
                  ]}
                  headings={[
                    "Product",
                    "SKU",
                    "Order",
                    "Qty",
                    "Amount",
                    "Date",
                  ]}
                  rows={productRefunds.map((r) => [
                    r.product,
                    r.sku,
                    r.orderName,
                    r.quantity,
                    formatCurrency(r.amount),
                    r.date,
                  ])}
                />
              ) : (
                <s-text tone="subdued">No refund data for this period.</s-text>
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
