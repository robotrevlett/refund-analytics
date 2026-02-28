import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";
import { pollBulkOperation, processCompletedSync } from "../models/sync.server.js";

export const action = async ({ request }) => {
  const { topic, shop, payload, admin } = await authenticate.webhook(request);

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
      try {
        await handleBulkOperationFinish(shop, payload, admin);
      } catch (error) {
        console.error(`Failed to handle bulk finish for ${shop}:`, error);
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
      // This app stores order/refund data by shop, not by individual customer.
      // No customer-specific data to export beyond what Shopify already provides.
      console.log(`GDPR data request for ${shop}`);
      break;

    case "CUSTOMERS_REDACT":
      // Delete any records that could be linked to the customer's orders.
      // The payload contains customer.id and orders_to_redact[].
      try {
        const orderIds = (payload.orders_to_redact || []).map(
          (o) => `gid://shopify/Order/${o.id}`,
        );
        if (orderIds.length > 0) {
          await db.refundRecord.deleteMany({
            where: { shop, orderId: { in: orderIds } },
          });
          await db.returnReasonRecord.deleteMany({
            where: { shop, orderId: { in: orderIds } },
          });
          await db.orderRecord.deleteMany({
            where: { shop, id: { in: orderIds } },
          });
        }
      } catch (error) {
        console.error(`GDPR customer redact failed for ${shop}:`, error);
      }
      break;

    case "SHOP_REDACT":
      // Shop data erasure — delete all data for this shop (same as uninstall)
      try {
        await db.returnReasonRecord.deleteMany({ where: { shop } });
        await db.refundRecord.deleteMany({ where: { shop } });
        await db.orderRecord.deleteMany({ where: { shop } });
        await db.shop.deleteMany({ where: { id: shop } });
        await db.session.deleteMany({ where: { shop } });
      } catch (error) {
        console.error(`GDPR shop redact failed for ${shop}:`, error);
      }
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

async function handleBulkOperationFinish(shop, payload, admin) {
  const { admin_graphql_api_id, status, type } = payload;

  if (type !== "query") {
    return;
  }

  // Handle failed/canceled bulk operations
  if (status !== "completed") {
    if (status === "failed" || status === "canceled") {
      await db.shop.updateMany({
        where: { id: shop, syncOperationId: admin_graphql_api_id },
        data: { syncStatus: "failed", syncOperationId: null },
      });
    }
    return;
  }

  // Verify this bulk operation belongs to our shop's sync
  const shopRecord = await db.shop.findUnique({
    where: { id: shop },
    select: { syncOperationId: true },
  });

  if (shopRecord?.syncOperationId !== admin_graphql_api_id) {
    return;
  }

  if (!admin) {
    // No admin session available (e.g. app was uninstalled) — mark as
    // needing processing so the sync page can pick it up on next visit
    await db.shop.update({
      where: { id: shop },
      data: { syncStatus: "completed" },
    });
    return;
  }

  // Poll the operation to get the JSONL URL and process the data
  const opStatus = await pollBulkOperation(admin, admin_graphql_api_id);
  if (opStatus.status === "COMPLETED" && opStatus.url) {
    await processCompletedSync(admin, shop, opStatus.url);
  }
}
