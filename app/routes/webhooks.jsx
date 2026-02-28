import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      await db.session.deleteMany({ where: { shop } });
      await db.shop.deleteMany({ where: { id: shop } });
      await db.orderRecord.deleteMany({ where: { shop } });
      await db.refundRecord.deleteMany({ where: { shop } });
      await db.returnReasonRecord.deleteMany({ where: { shop } });
      break;

    case "REFUNDS_CREATE":
      try {
        await handleRefundCreate(shop, payload);
      } catch (error) {
        console.error(`Failed to handle refund webhook for ${shop}:`, error);
      }
      break;

    case "ORDERS_UPDATED":
      // Refund additions are caught by REFUNDS_CREATE.
      // This topic fires on any order state change — we only care about
      // financial status updates to keep OrderRecord current.
      try {
        await handleOrderUpdated(shop, payload);
      } catch (error) {
        console.error(`Failed to handle order update for ${shop}:`, error);
      }
      break;

    case "BULK_OPERATIONS_FINISH":
      await handleBulkOperationFinish(shop, payload);
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      console.log(`GDPR webhook: ${topic} for ${shop}`);
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response(null, { status: 200 });
};

async function handleRefundCreate(shop, payload) {
  const { id, order_id, created_at, transactions, refund_line_items, note } =
    payload;

  const totalAmount = (transactions || [])
    .filter((t) => t.kind === "refund" && t.status === "success")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const currency =
    (transactions || []).find((t) => t.currency)?.currency || "USD";

  const lineItems = (refund_line_items || []).map((rli) => ({
    sku: rli.line_item?.sku || "",
    title: rli.line_item?.title || "",
    quantity: rli.quantity,
    amount: parseFloat(rli.subtotal || 0),
  }));

  // Look up order name from DB if available
  const orderGid = `gid://shopify/Order/${order_id}`;
  const existingOrder = await db.orderRecord.findUnique({
    where: { id: orderGid },
    select: { name: true },
  });

  await db.refundRecord.upsert({
    where: { id: `gid://shopify/Refund/${id}` },
    update: {
      amount: totalAmount,
      note: note || null,
      lineItems: JSON.stringify(lineItems),
      currency,
    },
    create: {
      id: `gid://shopify/Refund/${id}`,
      shop,
      orderId: orderGid,
      orderName: existingOrder?.name || `#${order_id}`,
      refundDate: new Date(created_at),
      amount: totalAmount,
      currency,
      note: note || null,
      lineItems: JSON.stringify(lineItems),
    },
  });
}

async function handleOrderUpdated(shop, payload) {
  const { id, financial_status } = payload;
  if (!financial_status) return;

  const orderGid = `gid://shopify/Order/${id}`;
  await db.orderRecord.updateMany({
    where: { id: orderGid, shop },
    data: { financialStatus: financial_status.toUpperCase() },
  });
}

async function handleBulkOperationFinish(shop, payload) {
  const { admin_graphql_api_id, status, type } = payload;

  if (type !== "query" || status !== "completed") {
    return;
  }

  // Mark sync as completed — the actual JSONL processing happens when
  // the sync page polls for status. The webhook doesn't have an admin
  // API session to call processCompletedSync directly, but we store the
  // operation ID so the sync route can pick it up.
  await db.shop.updateMany({
    where: { id: shop, syncOperationId: admin_graphql_api_id },
    data: { syncStatus: "completed" },
  });
}
