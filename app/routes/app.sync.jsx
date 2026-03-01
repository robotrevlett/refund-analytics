import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useRef, useEffect } from "react";
import { authenticate } from "../shopify.server.js";
import {
  getShopSyncStatus,
  startBulkSync,
  pollBulkOperation,
  processCompletedSync,
  markSyncFailed,
} from "../models/sync.server.js";
import { AppBanners } from "../components/AppBanners.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const syncStatus = await getShopSyncStatus(shop);

  // If a sync is running or just completed, poll and process
  if (
    (syncStatus.status === "running" || syncStatus.status === "completed") &&
    syncStatus.operationId
  ) {
    try {
      const opStatus = await pollBulkOperation(admin, syncStatus.operationId);
      if (opStatus.status === "COMPLETED" && opStatus.url) {
        await processCompletedSync(admin, shop, opStatus.url);
      } else if (opStatus.status === "FAILED" || opStatus.status === "CANCELED") {
        await markSyncFailed(shop);
      }
    } catch (error) {
      console.error("Sync processing error:", error);
      // processCompletedSync already sets syncStatus to "failed" on error
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

  const buttonRef = useRef(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const handler = () => handleSync();
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  });

  return (
    <>
      <AppBanners />
      <s-page title="Data Sync" back-action-url="/app">
        <s-stack gap="500">
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">Sync Status</s-text>

              {syncStatus.status === "pending" && (
                <s-banner tone="warning">
                  <p>
                    No data has been synced yet. Start a sync to pull your order
                    and refund data from Shopify.
                  </p>
                </s-banner>
              )}

              {syncStatus.status === "running" && (
                <s-stack gap="200">
                  <s-stack direction="horizontal" gap="200" block-align="center">
                    <s-spinner size="small" />
                    <s-text>Sync in progress...</s-text>
                  </s-stack>
                  <s-text tone="subdued" variant="bodySm">
                    Large stores may take a few minutes. Refresh to check
                    progress.
                  </s-text>
                </s-stack>
              )}

              {syncStatus.status === "completed" && (
                <s-banner tone="success">
                  <p>
                    Last synced:{" "}
                    {syncStatus.lastSyncAt
                      ? new Date(syncStatus.lastSyncAt).toLocaleString()
                      : "Never"}
                  </p>
                </s-banner>
              )}

              {syncStatus.status === "failed" && (
                <s-banner tone="critical">
                  <p>
                    The last sync failed. Try again or contact support if the
                    issue persists.
                  </p>
                </s-banner>
              )}

              <s-button
                ref={buttonRef}
                variant="primary"
                disabled={isSubmitting || syncStatus.status === "running" || undefined}
              >
                {syncStatus.status === "pending"
                  ? "Start Initial Sync"
                  : "Re-sync Data"}
              </s-button>
            </s-stack>
          </s-section>
        </s-stack>
      </s-page>
    </>
  );
}
