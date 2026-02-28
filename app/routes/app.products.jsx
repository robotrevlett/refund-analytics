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
import { getProductRefunds, getTopRefundedProducts } from "../models/refund.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  const [topProducts, productRefunds] = await Promise.all([
    getTopRefundedProducts(shop, days, 50),
    getProductRefunds(shop, days),
  ]);

  return json({ topProducts, productRefunds, days });
};

export default function ProductsPage() {
  const { topProducts, productRefunds, days } = useLoaderData();
  const [selectedDays, setSelectedDays] = useState(String(days));

  const handleDaysChange = useCallback((value) => {
    setSelectedDays(value);
    window.location.href = `/app/products?days=${value}`;
  }, []);

  const dateRangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <Page title="Product Refund Breakdown" backAction={{ url: "/app" }}>
      <BlockStack gap="500">
        <Box paddingInlineEnd="300">
          <InlineGrid columns="1fr auto" alignItems="center">
            <Text variant="headingMd" as="h2">By Product</Text>
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
                  Top Refunded Products
                </Text>
                {topProducts.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "numeric",
                      "numeric",
                    ]}
                    headings={["Product", "Refund Count", "Refund Amount"]}
                    rows={topProducts.map((p) => [
                      p.title,
                      p.count,
                      formatCurrency(p.amount),
                    ])}
                    sortable={[false, true, true]}
                  />
                ) : (
                  <Text tone="subdued">No refund data for this period.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Refund Details by Product
                </Text>
                {productRefunds.length > 0 ? (
                  <DataTable
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
                  <Text tone="subdued">No refund data for this period.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
