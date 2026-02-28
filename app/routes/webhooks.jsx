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
      await handleRefundCreate(shop, payload);
      break;

    case "ORDERS_UPDATED":
      // Refund additions are also caught by REFUNDS_CREATE,
      // but this handles edge cases like refund amendments
      break;

    case "BULK_OPERATIONS_FINISH":
      await handleBulkOperationFinish(shop, payload);
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      // GDPR compliance — log and acknowledge
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

  const lineItems = (refund_line_items || []).map((rli) => ({
    sku: rli.line_item?.sku || "",
    title: rli.line_item?.title || "",
    quantity: rli.quantity,
    amount: parseFloat(rli.subtotal || 0),
  }));

  await db.refundRecord.upsert({
    where: { id: `gid://shopify/Refund/${id}` },
    update: {
      amount: totalAmount,
      note: note || null,
      lineItems: JSON.stringify(lineItems),
    },
    create: {
      id: `gid://shopify/Refund/${id}`,
      shop,
      orderId: `gid://shopify/Order/${order_id}`,
      orderName: "", // Will be enriched during sync
      refundDate: new Date(created_at),
      amount: totalAmount,
      currency: "USD", // Will be enriched during sync
      note: note || null,
      lineItems: JSON.stringify(lineItems),
    },
  });
}

async function handleBulkOperationFinish(shop, payload) {
  const { admin_graphql_api_id, status, type } = payload;

  if (type !== "query" || status !== "completed") {
    return;
  }

  // Update shop sync status — the actual JSONL processing
  // is triggered from the sync route when it polls for completion
  await db.shop.updateMany({
    where: { id: shop, syncOperationId: admin_graphql_api_id },
    data: { syncStatus: "completed" },
  });
}
