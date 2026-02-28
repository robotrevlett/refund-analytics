import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const SHOP = "test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

function loadFixture(name) {
  const path = resolve("tests/fixtures/webhooks", name);
  return JSON.parse(readFileSync(path, "utf-8"));
}

/**
 * Since the actual webhook handler depends on Shopify's authenticate.webhook,
 * we test the handler logic directly rather than going through the route.
 * This mirrors what handleRefundCreate does in webhooks.jsx.
 */
async function simulateRefundCreate(db, shop, payload) {
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
      orderName: "",
      refundDate: new Date(created_at),
      amount: totalAmount,
      currency: "USD",
      note: note || null,
      lineItems: JSON.stringify(lineItems),
    },
  });
}

async function simulateBulkFinish(db, shop, payload) {
  const { admin_graphql_api_id, status, type } = payload;

  if (type !== "query" || status !== "completed") return;

  await db.shop.updateMany({
    where: { id: shop, syncOperationId: admin_graphql_api_id },
    data: { syncStatus: "completed" },
  });
}

describe("webhook: refunds/create", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("creates a RefundRecord from webhook payload", async () => {
    const payload = loadFixture("refund-create.json");
    await simulateRefundCreate(db, SHOP, payload);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });

    expect(record).toBeDefined();
    expect(record.shop).toBe(SHOP);
    expect(record.orderId).toBe("gid://shopify/Order/1001");
    expect(record.amount).toBeCloseTo(49.99, 2);
    expect(record.note).toContain("sizing issue");

    const lineItems = JSON.parse(record.lineItems);
    expect(lineItems).toHaveLength(2);
    expect(lineItems[0].title).toBe("Classic Cotton T-Shirt");
    expect(lineItems[0].sku).toBe("APP-TSH-001");
    expect(lineItems[1].amount).toBe(20);
  });

  it("upserts on duplicate refund ID", async () => {
    const payload = loadFixture("refund-create.json");
    await simulateRefundCreate(db, SHOP, payload);

    // Simulate receiving the same webhook again with updated note
    const updatedPayload = { ...payload, note: "Updated note" };
    await simulateRefundCreate(db, SHOP, updatedPayload);

    const records = await db.refundRecord.findMany({
      where: { id: "gid://shopify/Refund/9999" },
    });
    expect(records).toHaveLength(1);
    expect(records[0].note).toBe("Updated note");
  });

  it("handles payload with no transactions gracefully", async () => {
    const payload = { ...loadFixture("refund-create.json"), transactions: [] };
    await simulateRefundCreate(db, SHOP, payload);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });
    expect(record.amount).toBe(0);
  });
});

describe("webhook: bulk_operations/finish", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  it("updates shop sync status to completed", async () => {
    const payload = loadFixture("bulk-finish.json");

    await db.shop.create({
      data: {
        id: SHOP,
        syncStatus: "running",
        syncOperationId: payload.admin_graphql_api_id,
      },
    });

    await simulateBulkFinish(db, SHOP, payload);

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("completed");
  });

  it("ignores non-query bulk operations", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: "gid://shopify/BulkOperation/12345" },
    });

    await simulateBulkFinish(db, SHOP, {
      admin_graphql_api_id: "gid://shopify/BulkOperation/12345",
      status: "completed",
      type: "mutation", // not a query
    });

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("running"); // unchanged
  });

  it("ignores failed bulk operations", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: "gid://shopify/BulkOperation/12345" },
    });

    await simulateBulkFinish(db, SHOP, {
      admin_graphql_api_id: "gid://shopify/BulkOperation/12345",
      status: "failed",
      type: "query",
    });

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("running"); // unchanged
  });
});
