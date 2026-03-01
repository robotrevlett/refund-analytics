import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server.js";
import { getShopSyncStatus } from "../models/sync.server.js";
import db from "../db.server.js";
import { AppBanners } from "../components/AppBanners.jsx";

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
  return <s-badge tone={tone}>{label}</s-badge>;
}

export default function SettingsPage() {
  const { shop, syncStatus, dataCounts } = useLoaderData();

  return (
    <>
      <AppBanners />
      <s-page title="Settings" back-action-url="/app">
        <s-stack gap="500">
          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">Store Info</s-text>
              <s-grid columns="2" gap="200">
                <s-text tone="subdued">Store</s-text>
                <s-text>{shop}</s-text>
                <s-text tone="subdued">Sync status</s-text>
                <s-box>{syncStatusBadge(syncStatus.status)}</s-box>
                <s-text tone="subdued">Last synced</s-text>
                <s-text>
                  {syncStatus.lastSyncAt
                    ? new Date(syncStatus.lastSyncAt).toLocaleString()
                    : "Never"}
                </s-text>
              </s-grid>
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">Data Summary</s-text>
              <s-grid columns="2" gap="200">
                <s-text tone="subdued">Orders tracked</s-text>
                <s-text>{dataCounts.orders.toLocaleString()}</s-text>
                <s-text tone="subdued">Refunds tracked</s-text>
                <s-text>{dataCounts.refunds.toLocaleString()}</s-text>
                <s-text tone="subdued">Return reasons tracked</s-text>
                <s-text>{dataCounts.returnReasons.toLocaleString()}</s-text>
              </s-grid>
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">About</s-text>
              <s-text>
                Refund &amp; Return Analytics shows your real revenue after
                refunds. Refunds are grouped by refund date (not order date) so
                you see the true impact on each period's revenue.
              </s-text>
              <s-text tone="subdued">
                Data syncs via Shopify Bulk Operations and stays up to date via
                webhooks. Visit the{" "}
                <Link to="/app/sync">Data Sync</Link> page to trigger a manual
                sync.
              </s-text>
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="400">
              <s-text variant="headingMd" as="h2">Legal</s-text>
              <s-text>
                <Link to="/app/privacy">Privacy Policy</Link>
              </s-text>
              <s-text>
                <Link to="/app/terms">Terms of Service</Link>
              </s-text>
            </s-stack>
          </s-section>
        </s-stack>
      </s-page>
    </>
  );
}
