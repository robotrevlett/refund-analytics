import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useCallback, useRef, useEffect } from "react";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics, getTopRefundedProducts, getRefundTrend } from "../models/refund.server.js";
import { getReturnReasonBreakdown } from "../models/return-reason.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import { parseDays } from "../utils.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { DateRangeSelector } from "../components/DateRangeSelector.jsx";
import { BarChart } from "../components/BarChart.jsx";
import { useCurrencyFormatter } from "../components/useCurrencyFormatter.js";
import { AppBanners } from "../components/AppBanners.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseDays(url.searchParams);

  const [metrics, topProducts, trend, reasonBreakdown, syncStatus] = await Promise.all([
    getDashboardMetrics(shop, days),
    getTopRefundedProducts(shop, days, 10),
    getRefundTrend(shop, days),
    getReturnReasonBreakdown(shop, days),
    getShopSyncStatus(shop),
  ]);

  return json({ metrics, topProducts, trend, reasonBreakdown, syncStatus, days });
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

export default function Dashboard() {
  const { metrics, topProducts, trend, reasonBreakdown, syncStatus, days } = useLoaderData();
  const navigate = useNavigate();

  const handleDaysChange = useCallback((value) => {
    navigate(`/app?days=${value}`);
  }, [navigate]);

  const formatCurrency = useCurrencyFormatter(metrics.currency);

  return (
    <>
      <AppBanners />
      <s-page title="Refund & Return Analytics">
        <s-stack gap="500">
          {syncStatus.status === "pending" && metrics.grossSales === 0 && metrics.totalRefunds === 0 ? (
            <s-section>
              <s-stack gap="400">
                <s-text variant="headingMd" as="h2">No refund data yet</s-text>
                <p>
                  Sync your Shopify orders to start seeing refund and return
                  analytics. The initial sync usually takes a few minutes.
                </p>
                <s-button
                  ref={(el) => {
                    if (el) el.addEventListener("click", () => navigate("/app/sync"));
                  }}
                >
                  Sync order data
                </s-button>
              </s-stack>
            </s-section>
          ) : null}

          {syncStatus.status === "pending" && (metrics.grossSales > 0 || metrics.totalRefunds > 0) && (
            <s-banner
              title="Data sync incomplete"
              tone="warning"
            >
              <p>Sync your order data to see complete refund analytics.</p>
              <s-button
                ref={(el) => {
                  if (el) el.addEventListener("click", () => navigate("/app/sync"));
                }}
              >
                Start sync
              </s-button>
            </s-banner>
          )}

          {!(syncStatus.status === "pending" && metrics.grossSales === 0 && metrics.totalRefunds === 0) && (
          <>
          <s-box padding-inline-end="300">
            <s-grid columns="1fr auto" align-items="center">
              <s-text variant="headingMd" as="h2">Overview</s-text>
              <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
            </s-grid>
          </s-box>

          <s-grid columns="4" gap="400">
            <MetricCard
              title="Gross Sales"
              value={formatCurrency(metrics.grossSales)}
            />
            <MetricCard
              title="Total Refunds"
              value={formatCurrency(metrics.totalRefunds)}
              tone="critical"
            />
            <MetricCard
              title="Net Revenue"
              value={formatCurrency(metrics.netRevenue)}
              tone="success"
            />
            <MetricCard
              title="Refund Rate"
              value={`${metrics.refundRate.toFixed(1)}%`}
              tone={metrics.refundRate > 10 ? "critical" : "subdued"}
            />
          </s-grid>

          <s-stack gap="500">
            <s-section>
              <s-stack gap="400">
                <s-text variant="headingMd" as="h2">Refund Trend</s-text>
                {trend.length > 0 ? (
                  <s-stack gap="400">
                    <BarChart
                      data={trend}
                      formatValue={formatCurrency}
                    />
                    <SimpleTable
                      columnContentTypes={["text", "numeric", "numeric"]}
                      headings={["Date", "Count", "Amount"]}
                      rows={trend.map((row) => [
                        row.date,
                        row.count,
                        formatCurrency(row.amount),
                      ])}
                    />
                  </s-stack>
                ) : (
                  <s-text tone="subdued">No refund data for this period.</s-text>
                )}
              </s-stack>
            </s-section>

            <s-section>
              <s-stack gap="400">
                <s-text variant="headingMd" as="h2">Top Refunded Products</s-text>
                {topProducts.length > 0 ? (
                  <SimpleTable
                    columnContentTypes={["text", "numeric", "numeric"]}
                    headings={["Product", "Count", "Amount"]}
                    rows={topProducts.map((p) => [
                      p.title,
                      p.count,
                      formatCurrency(p.amount),
                    ])}
                  />
                ) : (
                  <s-text tone="subdued">No refund data yet.</s-text>
                )}
              </s-stack>
            </s-section>

            <s-section>
              <s-stack gap="400">
                <s-text variant="headingMd" as="h2">Return Reasons</s-text>
                {reasonBreakdown.length > 0 ? (
                  <SimpleTable
                    columnContentTypes={["text", "text", "numeric"]}
                    headings={["Reason", "Category", "Count"]}
                    rows={reasonBreakdown.map((r) => [
                      r.reason,
                      r.category,
                      r.count,
                    ])}
                  />
                ) : (
                  <s-text tone="subdued">
                    No return reason data for this period.
                  </s-text>
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
