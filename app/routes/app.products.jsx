import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  Box,
  InlineGrid,
  EmptyState,
} from "@shopify/polaris";
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

  return { topProducts, productRefunds, productReasons, days, currency, syncStatus };
};

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
  };

  const handleSort = useCallback((index, direction) => {
    setSortIndex(index);
    setSortDirection(direction);
  }, []);

  return (
    <>
      <AppBanners />
      <Page title="Product Refund Breakdown" backAction={{ url: "/app" }}>
        <BlockStack gap="500">
        {syncStatus.status === "pending" && topProducts.length === 0 ? (
          <Card>
            <EmptyState
              heading="No product refund data"
              action={{ content: "Sync order data", url: "/app/sync" }}
            >
              <p>Sync your Shopify orders to see product-level refund breakdowns.</p>
            </EmptyState>
          </Card>
        ) : (
        <>
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
                {sortedProducts.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric"]}
                    headings={["Product", "Refund Count", "Refund Amount"]}
                    rows={sortedProducts.map((p) => [
                      p.sku ? `${p.title} (${p.sku})` : p.title,
                      p.count,
                      formatCurrency(p.amount),
                    ])}
                    sortable={[false, true, true]}
                    defaultSortDirection="descending"
                    initialSortColumnIndex={2}
                    onSort={handleSort}
                  />
                ) : (
                  <Text tone="subdued">No refund data for this period.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {productReasons.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Return Reasons by Product
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "text", "text", "numeric"]}
                    headings={["Product", "SKU", "Reason", "Quantity"]}
                    rows={productReasons.map((r) => [
                      r.product,
                      r.sku,
                      r.reason,
                      r.quantity,
                    ])}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Refund Details
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
        </>
        )}
        </BlockStack>
      </Page>
    </>
  );
}
