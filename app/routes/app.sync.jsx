import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import {
  getShopSyncStatus,
  startBulkSync,
  pollBulkOperation,
  processCompletedSync,
} from "../models/sync.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const syncStatus = await getShopSyncStatus(shop);

  // If a sync is running, poll for completion
  if (syncStatus.status === "running" && syncStatus.operationId) {
    const opStatus = await pollBulkOperation(admin, syncStatus.operationId);
    if (opStatus.status === "COMPLETED" && opStatus.url) {
      await processCompletedSync(admin, shop, opStatus.url);
    }
    return json({ syncStatus: await getShopSyncStatus(shop) });
  }

  return json({ syncStatus });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const result = await startBulkSync(admin, shop);
  return json({ result });
};

export default function SyncPage() {
  const { syncStatus } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const handleSync = () => {
    submit({}, { method: "POST" });
  };

  return (
    <Page title="Data Sync" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Sync Status</Text>

              {syncStatus.status === "pending" && (
                <Banner tone="warning">
                  <p>
                    No data has been synced yet. Start a sync to pull your order
                    and refund data from Shopify.
                  </p>
                </Banner>
              )}

              {syncStatus.status === "running" && (
                <BlockStack gap="200">
                  <Text>Sync in progress...</Text>
                  <ProgressBar progress={50} tone="primary" />
                  <Text tone="subdued" variant="bodySm">
                    Large stores may take a few minutes. Refresh to check
                    progress.
                  </Text>
                </BlockStack>
              )}

              {syncStatus.status === "completed" && (
                <Banner tone="success">
                  <p>
                    Last synced:{" "}
                    {syncStatus.lastSyncAt
                      ? new Date(syncStatus.lastSyncAt).toLocaleString()
                      : "Never"}
                  </p>
                </Banner>
              )}

              {syncStatus.status === "failed" && (
                <Banner tone="critical">
                  <p>
                    The last sync failed. Try again or contact support if the
                    issue persists.
                  </p>
                </Banner>
              )}

              <Button
                variant="primary"
                onClick={handleSync}
                loading={isSubmitting}
                disabled={syncStatus.status === "running"}
              >
                {syncStatus.status === "pending"
                  ? "Start Initial Sync"
                  : "Re-sync Data"}
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
