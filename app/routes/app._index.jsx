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
  Select,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics, getTopRefundedProducts, getRefundTrend } from "../models/refund.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import { parseDays } from "../utils.server.js";
import { MetricCard } from "../components/MetricCard.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseDays(url.searchParams);

  const [metrics, topProducts, trend, syncStatus] = await Promise.all([
    getDashboardMetrics(shop, days),
    getTopRefundedProducts(shop, days, 10),
    getRefundTrend(shop, days),
    getShopSyncStatus(shop),
  ]);

  return json({ metrics, topProducts, trend, syncStatus, days });
};

export default function Dashboard() {
  const { metrics, topProducts, trend, syncStatus, days } = useLoaderData();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState(String(days));

  const handleDaysChange = useCallback((value) => {
    setSelectedDays(value);
    navigate(`/app?days=${value}`);
  }, [navigate]);

  const dateRangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: metrics.currency || "USD",
    }).format(amount);

  return (
    <Page title="Refund & Return Analytics">
      <BlockStack gap="500">
        {syncStatus.status === "pending" && (
          <Banner
            title="No data synced yet"
            action={{ content: "Start sync", url: "/app/sync" }}
            tone="warning"
          >
            <p>Sync your order data to see refund analytics.</p>
          </Banner>
        )}

        <Box paddingInlineEnd="300">
          <InlineGrid columns="1fr auto" alignItems="center">
            <Text variant="headingMd" as="h2">Overview</Text>
            <Select
              label="Date range"
              labelHidden
              options={dateRangeOptions}
              value={selectedDays}
              onChange={handleDaysChange}
            />
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
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric"]}
                    headings={["Date", "Refund Count", "Refund Amount"]}
                    rows={trend.map((row) => [
                      row.date,
                      row.count,
                      formatCurrency(row.amount),
                    ])}
                  />
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
        </Layout>
      </BlockStack>
    </Page>
  );
}
