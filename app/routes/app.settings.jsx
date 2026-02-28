import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const syncStatus = await getShopSyncStatus(shop);
  return json({ shop, syncStatus });
};

export default function SettingsPage() {
  const { shop, syncStatus } = useLoaderData();

  return (
    <Page title="Settings" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Store Info</Text>
              <Text>Store: {shop}</Text>
              <Text>
                Last sync:{" "}
                {syncStatus.lastSyncAt
                  ? new Date(syncStatus.lastSyncAt).toLocaleString()
                  : "Never"}
              </Text>
              <Text>Sync status: {syncStatus.status}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
