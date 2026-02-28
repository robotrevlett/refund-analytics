import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  DataTable,
  Banner,
  Box,
  EmptyState,
} from "@shopify/polaris";
import { useCallback } from "react";
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
      <Page title="Refund & Return Analytics">
        <BlockStack gap="500">
          {syncStatus.status === "pending" && metrics.grossSales === 0 && metrics.totalRefunds === 0 ? (
            <Card>
              <EmptyState
                heading="No refund data yet"
                action={{ content: "Sync order data", url: "/app/sync" }}
              >
                <p>
                  Sync your Shopify orders to start seeing refund and return
                  analytics. The initial sync usually takes a few minutes.
                </p>
              </EmptyState>
            </Card>
          ) : null}

          {syncStatus.status === "pending" && (metrics.grossSales > 0 || metrics.totalRefunds > 0) && (
            <Banner
              title="Data sync incomplete"
              action={{ content: "Start sync", url: "/app/sync" }}
              tone="warning"
            >
              <p>Sync your order data to see complete refund analytics.</p>
            </Banner>
          )}

          {!(syncStatus.status === "pending" && metrics.grossSales === 0 && metrics.totalRefunds === 0) && (
          <>
          <Box paddingInlineEnd="300">
            <InlineGrid columns="1fr auto" alignItems="center">
              <Text variant="headingMd" as="h2">Overview</Text>
              <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
            </InlineGrid>
          </Box>

          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
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
          </InlineGrid>

          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Refund Trend</Text>
                  {trend.length > 0 ? (
                    <BlockStack gap="400">
                      <BarChart
                        data={trend}
                        formatValue={formatCurrency}
                      />
                      <DataTable
                        columnContentTypes={["text", "numeric", "numeric"]}
                        headings={["Date", "Count", "Amount"]}
                        rows={trend.map((row) => [
                          row.date,
                          row.count,
                          formatCurrency(row.amount),
                        ])}
                      />
                    </BlockStack>
                  ) : (
                    <Text tone="subdued">No refund data for this period.</Text>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Top Refunded Products</Text>
                  {topProducts.length > 0 ? (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric"]}
                      headings={["Product", "Count", "Amount"]}
                      rows={topProducts.map((p) => [
                        p.title,
                        p.count,
                        formatCurrency(p.amount),
                      ])}
                    />
                  ) : (
                    <Text tone="subdued">No refund data yet.</Text>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Return Reasons</Text>
                  {reasonBreakdown.length > 0 ? (
                    <DataTable
                      columnContentTypes={["text", "text", "numeric"]}
                      headings={["Reason", "Category", "Count"]}
                      rows={reasonBreakdown.map((r) => [
                        r.reason,
                        r.category,
                        r.count,
                      ])}
                    />
                  ) : (
                    <Text tone="subdued">
                      No return reason data for this period.
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
          </>
          )}
        </BlockStack>
      </Page>
    </>
  );
}
