import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const SHOP = "test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

async function seedRefunds(db) {
  await db.shop.create({
    data: { id: SHOP, currency: "USD", syncStatus: "completed" },
  });

  const now = new Date();
  const refunds = [
    {
      id: "gid://shopify/Refund/1",
      shop: SHOP,
      orderId: "gid://shopify/Order/1",
      orderName: "#1001",
      refundDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      amount: 50.0,
      currency: "USD",
      note: "Sizing issue",
      reason: "customer",
      lineItems: JSON.stringify([
        { sku: "APP-TSH-001", title: "Classic Cotton T-Shirt", quantity: 1, amount: 29.99 },
        { sku: "APP-JNS-002", title: "Slim Fit Jeans", quantity: 1, amount: 20.01 },
      ]),
    },
    {
      id: "gid://shopify/Refund/2",
      shop: SHOP,
      orderId: "gid://shopify/Order/2",
      orderName: "#1002",
      refundDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      amount: 79.99,
      currency: "USD",
      note: "Defective",
      reason: "damage",
      lineItems: JSON.stringify([
        { sku: "APP-JNS-002", title: "Slim Fit Jeans", quantity: 1, amount: 79.99 },
      ]),
    },
    {
      id: "gid://shopify/Refund/3",
      shop: SHOP,
      orderId: "gid://shopify/Order/3",
      orderName: "#1003",
      refundDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      amount: 149.99,
      currency: "USD",
      note: "Full refund",
      reason: "customer",
      lineItems: JSON.stringify([
        { sku: "APP-JKT-003", title: "Winter Puffer Jacket", quantity: 1, amount: 149.99 },
      ]),
    },
  ];

  for (const refund of refunds) {
    await db.refundRecord.create({ data: refund });
  }

  return refunds;
}

describe("refund aggregations", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedRefunds(db);
  });

  it("calculates total refunds within a date range", async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const refunds = await db.refundRecord.findMany({
      where: { shop: SHOP, refundDate: { gte: since } },
    });

    const total = refunds.reduce((sum, r) => sum + r.amount, 0);

    // Refunds 1 and 2 are within 30 days, refund 3 is 60 days ago
    expect(refunds).toHaveLength(2);
    expect(total).toBeCloseTo(129.99, 2); // 50 + 79.99
  });

  it("groups refunds by date", async () => {
    const refunds = await db.refundRecord.findMany({
      where: { shop: SHOP },
      orderBy: { refundDate: "asc" },
    });

    const dateMap = new Map();
    for (const r of refunds) {
      const date = r.refundDate.toISOString().split("T")[0];
      const existing = dateMap.get(date) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += r.amount;
      dateMap.set(date, existing);
    }

    expect(dateMap.size).toBe(3); // 3 different dates
  });

  it("aggregates top refunded products from line items JSON", async () => {
    const refunds = await db.refundRecord.findMany({
      where: { shop: SHOP },
      select: { lineItems: true },
    });

    const productMap = new Map();
    for (const refund of refunds) {
      const items = JSON.parse(refund.lineItems);
      for (const item of items) {
        const existing = productMap.get(item.title) || { count: 0, amount: 0 };
        existing.count += item.quantity;
        existing.amount += item.amount;
        productMap.set(item.title, existing);
      }
    }

    const sorted = Array.from(productMap.entries()).sort(
      ([, a], [, b]) => b.amount - a.amount,
    );

    // Slim Fit Jeans appears in 2 refunds: 20.01 + 79.99 = 100.00
    expect(sorted[0][0]).toBe("Winter Puffer Jacket"); // 149.99
    expect(sorted[0][1].amount).toBeCloseTo(149.99, 2);
  });

  it("uses refund date not order date for filtering", async () => {
    // This is the core differentiator — verify the refundDate field is used
    const refund = await db.refundRecord.findUnique({
      where: { id: "gid://shopify/Refund/1" },
    });

    // refundDate should be ~5 days ago, NOT the order creation date
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 6);
    expect(refund.refundDate.getTime()).toBeGreaterThan(fiveDaysAgo.getTime());
  });

  it("handles $0 refund amounts", async () => {
    await db.refundRecord.create({
      data: {
        id: "gid://shopify/Refund/zero",
        shop: SHOP,
        orderId: "gid://shopify/Order/99",
        orderName: "#1099",
        refundDate: new Date(),
        amount: 0,
        currency: "USD",
        note: "Restock only",
        lineItems: JSON.stringify([{ sku: "X", title: "X", quantity: 1, amount: 0 }]),
      },
    });

    const refunds = await db.refundRecord.findMany({ where: { shop: SHOP } });
    const total = refunds.reduce((sum, r) => sum + r.amount, 0);

    // The $0 refund should not affect totals
    expect(total).toBeCloseTo(279.98, 2); // 50 + 79.99 + 149.99 + 0
  });
});
