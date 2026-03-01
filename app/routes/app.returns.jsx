import { useLoaderData, useNavigate, useOutletContext } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  Box,
  InlineGrid,
  Banner,
  EmptyState,
} from "@shopify/polaris";
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

  return { reasonBreakdown, reasonTrend, productReasons, days, syncStatus };
};

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
        <Page title="Return Reason Analytics" backAction={{ url: "/app" }}>
          <Banner title="Pro Plan Required" tone="warning">
            <p>Return Reason Analytics is available on the Pro plan. Upgrade in the Shopify admin to access detailed return reason tracking.</p>
          </Banner>
        </Page>
      </>
    );
  }

  return (
    <>
      <AppBanners />
      <Page title="Return Reason Analytics" backAction={{ url: "/app" }}>
        <BlockStack gap="500">
        {syncStatus.status === "pending" && reasonBreakdown.length === 0 ? (
          <Card>
            <EmptyState
              heading="No return reason data"
              action={{ content: "Sync order data", url: "/app/sync" }}
            >
              <p>Sync your Shopify orders to see return reason analytics.</p>
            </EmptyState>
          </Card>
        ) : (
        <>
        <Box paddingInlineEnd="300">
          <InlineGrid columns="1fr auto" alignItems="center">
            <Text variant="headingMd" as="h2">Return Reasons</Text>
            <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
          </InlineGrid>
        </Box>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Reason Breakdown
                </Text>
                {reasonBreakdown.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "numeric"]}
                    headings={["Reason", "Category", "Count", "Items Returned"]}
                    rows={reasonBreakdown.map((r) => [
                      r.reason,
                      r.category,
                      r.count,
                      r.quantity,
                    ])}
                    sortable={[false, false, true, true]}
                  />
                ) : (
                  <Text tone="subdued">
                    No return reason data for this period. Return reasons require
                    Shopify's structured return reasons feature (Jan 2026+).
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Reason Trends Over Time
                </Text>
                {reasonTrend.length > 0 ? (
                  <DataTable
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
                  <Text tone="subdued">No trend data for this period.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Return Reasons by Product
                </Text>
                {productReasons.length > 0 ? (
                  <DataTable
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
                  <Text tone="subdued">No return reason data for this period.</Text>
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
