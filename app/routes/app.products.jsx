import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { useCallback } from "react";
import { authenticate } from "../shopify.server.js";
import { getProductRefunds, getTopRefundedProducts } from "../models/refund.server.js";
import { parseDays, getShopCurrency } from "../utils.server.js";
import { DateRangeSelector } from "../components/DateRangeSelector.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const days = parseDays(url.searchParams);

  const [topProducts, productRefunds, currency] = await Promise.all([
    getTopRefundedProducts(shop, days, 50),
    getProductRefunds(shop, days),
    getShopCurrency(shop),
  ]);

  return json({ topProducts, productRefunds, days, currency });
};

export default function ProductsPage() {
  const { topProducts, productRefunds, days, currency } = useLoaderData();
  const navigate = useNavigate();

  const handleDaysChange = useCallback((value) => {
    navigate(`/app/products?days=${value}`);
  }, [navigate]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

  return (
    <Page title="Product Refund Breakdown" backAction={{ url: "/app" }}>
      <BlockStack gap="500">
        <Box paddingInlineEnd="300">
          <InlineGrid columns="1fr auto" alignItems="center">
            <Text variant="headingMd" as="h2">By Product</Text>
            <DateRangeSelector days={days} onDaysChange={handleDaysChange} />
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
                    columnContentTypes={["text", "numeric", "numeric"]}
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
