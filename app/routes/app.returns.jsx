import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  Select,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server.js";
import {
  getReturnReasonBreakdown,
  getReturnReasonsByProduct,
} from "../models/return-reason.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  const [reasonBreakdown, productReasons] = await Promise.all([
    getReturnReasonBreakdown(shop, days),
    getReturnReasonsByProduct(shop, days),
  ]);

  return json({ reasonBreakdown, productReasons, days });
};

export default function ReturnsPage() {
  const { reasonBreakdown, productReasons, days } = useLoaderData();
  const [selectedDays, setSelectedDays] = useState(String(days));

  const handleDaysChange = useCallback((value) => {
    setSelectedDays(value);
    window.location.href = `/app/returns?days=${value}`;
  }, []);

  const dateRangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];

  return (
    <Page title="Return Reason Analytics" backAction={{ url: "/app" }}>
      <BlockStack gap="500">
        <Box paddingInlineEnd="300">
          <InlineGrid columns="1fr auto" alignItems="center">
            <Text variant="headingMd" as="h2">Return Reasons</Text>
            <Select
              label="Date range"
              labelHidden
              options={dateRangeOptions}
              value={selectedDays}
              onChange={handleDaysChange}
            />
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
      </BlockStack>
    </Page>
  );
}
