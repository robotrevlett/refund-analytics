import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Link,
  InlineGrid,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import db from "../db.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const syncStatus = await getShopSyncStatus(shop);

  const [orderCount, refundCount, returnReasonCount] = await Promise.all([
    db.orderRecord.count({ where: { shop } }),
    db.refundRecord.count({ where: { shop } }),
    db.returnReasonRecord.count({ where: { shop } }),
  ]);

  return json({
    shop,
    syncStatus,
    dataCounts: { orders: orderCount, refunds: refundCount, returnReasons: returnReasonCount },
  });
};

function syncStatusBadge(status) {
  const map = {
    pending: { tone: "attention", label: "Pending" },
    running: { tone: "info", label: "Running" },
    completed: { tone: "success", label: "Completed" },
    failed: { tone: "critical", label: "Failed" },
  };
  const { tone, label } = map[status] || { tone: "default", label: status };
  return <Badge tone={tone}>{label}</Badge>;
}

export default function SettingsPage() {
  const { shop, syncStatus, dataCounts } = useLoaderData();

  return (
    <Page title="Settings" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Store Info</Text>
              <InlineGrid columns={2} gap="200">
                <Text tone="subdued">Store</Text>
                <Text>{shop}</Text>
                <Text tone="subdued">Sync status</Text>
                <Box>{syncStatusBadge(syncStatus.status)}</Box>
                <Text tone="subdued">Last synced</Text>
                <Text>
                  {syncStatus.lastSyncAt
                    ? new Date(syncStatus.lastSyncAt).toLocaleString()
                    : "Never"}
                </Text>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Data Summary</Text>
              <InlineGrid columns={2} gap="200">
                <Text tone="subdued">Orders tracked</Text>
                <Text>{dataCounts.orders.toLocaleString()}</Text>
                <Text tone="subdued">Refunds tracked</Text>
                <Text>{dataCounts.refunds.toLocaleString()}</Text>
                <Text tone="subdued">Return reasons tracked</Text>
                <Text>{dataCounts.returnReasons.toLocaleString()}</Text>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">About</Text>
              <Text>
                Refund &amp; Return Analytics shows your real revenue after
                refunds. Refunds are grouped by refund date (not order date) so
                you see the true impact on each period's revenue.
              </Text>
              <Text tone="subdued">
                Data syncs via Shopify Bulk Operations and stays up to date via
                webhooks. Visit the{" "}
                <Link url="/app/sync">Data Sync</Link> page to trigger a manual
                sync.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Legal</Text>
              <Text>
                <Link url="/app/privacy">Privacy Policy</Link>
              </Text>
              <Text>
                <Link url="/app/terms">Terms of Service</Link>
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
