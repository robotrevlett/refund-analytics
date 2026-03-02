import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  fetchSingleRefundDetail,
  fetchSingleReturnDetail,
  saveReturnReasons,
} from "../../app/models/sync.server.js";

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
 * This mirrors what handleRefundCreate does in webhooks.jsx, including the
 * enrichment step when an admin client is provided.
 */
async function simulateRefundCreate(db, shop, payload, admin) {
  const { id, order_id, created_at, transactions, refund_line_items, note } =
    payload;

  const refundTransactions = (transactions || [])
    .filter((t) => t.kind === "refund" && t.status === "success");
  const totalAmount = refundTransactions
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    .toFixed(2);

  const currency =
    (transactions || []).find((t) => t.currency)?.currency || "USD";

  const lineItems = (refund_line_items || []).map((rli) => ({
    sku: rli.line_item?.sku || "",
    title: rli.line_item?.title || "",
    quantity: rli.quantity,
    amount: rli.subtotal || "0",
  }));

  const refundGid = `gid://shopify/Refund/${id}`;

  await db.refundRecord.upsert({
    where: { id: refundGid },
    update: {
      amount: totalAmount,
      note: note || null,
      lineItems: JSON.stringify(lineItems),
      currency,
    },
    create: {
      id: refundGid,
      shop,
      orderId: `gid://shopify/Order/${order_id}`,
      orderName: "",
      refundDate: new Date(created_at),
      amount: totalAmount,
      currency,
      note: note || null,
      lineItems: JSON.stringify(lineItems),
    },
  });

  // Enrichment step — mirrors handleRefundCreate in webhooks.jsx
  if (!admin) return;

  try {
    const detail = await fetchSingleRefundDetail(admin, refundGid);
    if (!detail) return;

    const reason = detail.orderAdjustments?.edges?.[0]?.node?.reason || null;

    await db.refundRecord.update({
      where: { id: refundGid },
      data: {
        hasReturn: !!detail.return,
        returnId: detail.return?.id || null,
        reason,
      },
    });

    if (detail.return?.id) {
      const returnDetail = await fetchSingleReturnDetail(admin, detail.return.id);
      if (returnDetail) {
        await saveReturnReasons(shop, [returnDetail]);
      }
    }
  } catch (error) {
    // Best-effort enrichment — record already saved
    console.warn(`Refund enrichment failed for ${refundGid}:`, error.message);
  }
}

async function simulateBulkFinish(db, shop, payload) {
  const { admin_graphql_api_id, status, type } = payload;

  if (type !== "query") return;

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

  // For completed ops without admin (simulated), just mark status
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
    expect(Number(record.amount)).toBe(49.99);
    expect(record.note).toContain("sizing issue");

    const lineItems = JSON.parse(record.lineItems);
    expect(lineItems).toHaveLength(2);
    expect(lineItems[0].title).toBe("Classic Cotton T-Shirt");
    expect(lineItems[0].sku).toBe("APP-TSH-001");
    expect(Number(lineItems[1].amount)).toBe(20);
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
    expect(Number(record.amount)).toBe(0);
  });
});

describe("webhook: refunds/create enrichment", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
  });

  /**
   * Create a mock admin.graphql that dispatches based on query content.
   * Returns the appropriate fixture for RefundDetail vs ReturnDetail queries.
   */
  function createMockAdmin(refundFixture, returnFixture) {
    return {
      graphql: async (query) => ({
        json: async () => {
          if (query.includes("RefundDetail")) {
            return refundFixture;
          }
          if (query.includes("ReturnDetail")) {
            return returnFixture;
          }
          throw new Error(`Unexpected query: ${query}`);
        },
      }),
    };
  }

  it("enriches refund record with return data when return exists", async () => {
    const payload = loadFixture("refund-create.json");
    const refundFixture = loadFixture("refund-detail-response.json");
    const returnFixture = loadFixture("return-detail-response.json");
    const admin = createMockAdmin(refundFixture, returnFixture);

    await simulateRefundCreate(db, SHOP, payload, admin);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });

    expect(record.hasReturn).toBe(true);
    expect(record.returnId).toBe("gid://shopify/Return/5001");
    expect(record.reason).toBe("customer");

    const returnReason = await db.returnReasonRecord.findUnique({
      where: { id: "gid://shopify/ReturnLineItem/6001" },
    });

    expect(returnReason).toBeDefined();
    expect(returnReason.category).toBe("Sizing");
    expect(returnReason.reason).toBe("Size too small");
    expect(returnReason.quantity).toBe(1);
    expect(returnReason.productTitle).toBe("Classic Cotton T-Shirt");
  });

  it("creates refund record with hasReturn false when refund has no linked return", async () => {
    const payload = loadFixture("refund-create.json");
    const refundFixture = loadFixture("refund-detail-no-return.json");
    const admin = createMockAdmin(refundFixture, null);

    await simulateRefundCreate(db, SHOP, payload, admin);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });

    expect(record.hasReturn).toBe(false);
    expect(record.returnId).toBeNull();
    expect(record.reason).toBeNull();

    const returnReasonCount = await db.returnReasonRecord.count({
      where: { shop: SHOP },
    });
    expect(returnReasonCount).toBe(0);
  });

  it("creates refund record even when enrichment GraphQL call fails", async () => {
    const payload = loadFixture("refund-create.json");
    const admin = {
      graphql: async () => {
        throw new Error("GraphQL network error");
      },
    };

    await simulateRefundCreate(db, SHOP, payload, admin);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });

    expect(record).toBeDefined();
    expect(record.hasReturn).toBe(false);
    expect(record.returnId).toBeNull();
    expect(record.reason).toBeNull();
  });

  it("creates refund record without enrichment when admin is null", async () => {
    const payload = loadFixture("refund-create.json");

    await simulateRefundCreate(db, SHOP, payload, null);

    const record = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/9999" },
    });

    expect(record).toBeDefined();
    expect(record.hasReturn).toBe(false);
    expect(record.returnId).toBeNull();
    expect(record.reason).toBeNull();
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

  it("marks shop as failed when bulk operation fails", async () => {
    await db.shop.create({
      data: { id: SHOP, syncStatus: "running", syncOperationId: "gid://shopify/BulkOperation/12345" },
    });

    await simulateBulkFinish(db, SHOP, {
      admin_graphql_api_id: "gid://shopify/BulkOperation/12345",
      status: "failed",
      type: "query",
    });

    const shop = await db.shop.findUnique({ where: { id: SHOP } });
    expect(shop.syncStatus).toBe("failed");
    expect(shop.syncOperationId).toBeNull();
  });
});
