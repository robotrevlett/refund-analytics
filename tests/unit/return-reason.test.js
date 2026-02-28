import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const SHOP = "test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

async function seedReturnReasons(db) {
  await db.shop.create({
    data: { id: SHOP, currency: "USD", syncStatus: "completed" },
  });

  const now = new Date();
  const records = [
    {
      id: "gid://shopify/ReturnLineItem/1",
      shop: SHOP,
      returnId: "gid://shopify/Return/1",
      orderId: "gid://shopify/Order/1",
      reason: "Sizing too small",
      category: "Sizing",
      productTitle: "Classic Cotton T-Shirt",
      sku: "APP-TSH-001",
      quantity: 1,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "gid://shopify/ReturnLineItem/2",
      shop: SHOP,
      returnId: "gid://shopify/Return/2",
      orderId: "gid://shopify/Order/2",
      reason: "Sizing too small",
      category: "Sizing",
      productTitle: "Slim Fit Jeans",
      sku: "APP-JNS-002",
      quantity: 2,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      id: "gid://shopify/ReturnLineItem/3",
      shop: SHOP,
      returnId: "gid://shopify/Return/3",
      orderId: "gid://shopify/Order/3",
      reason: "Defective / damaged",
      category: "Quality",
      productTitle: "Wireless Earbuds",
      sku: "ELC-EAR-001",
      quantity: 1,
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      id: "gid://shopify/ReturnLineItem/4",
      shop: SHOP,
      returnId: "gid://shopify/Return/4",
      orderId: "gid://shopify/Order/4",
      reason: "Not as described",
      category: "Accuracy",
      productTitle: "Classic Cotton T-Shirt",
      sku: "APP-TSH-001",
      quantity: 1,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const record of records) {
    await db.returnReasonRecord.create({ data: record });
  }

  return records;
}

describe("return reason aggregations", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedReturnReasons(db);
  });

  it("groups by reason and counts correctly", async () => {
    const records = await db.returnReasonRecord.findMany({
      where: { shop: SHOP },
    });

    const reasonMap = new Map();
    for (const r of records) {
      const existing = reasonMap.get(r.reason) || { count: 0, quantity: 0 };
      existing.count += 1;
      existing.quantity += r.quantity;
      reasonMap.set(r.reason, existing);
    }

    expect(reasonMap.get("Sizing too small")).toEqual({ count: 2, quantity: 3 });
    expect(reasonMap.get("Defective / damaged")).toEqual({ count: 1, quantity: 1 });
    expect(reasonMap.get("Not as described")).toEqual({ count: 1, quantity: 1 });
  });

  it("groups by product and reason", async () => {
    const records = await db.returnReasonRecord.findMany({
      where: { shop: SHOP },
    });

    const productReasonMap = new Map();
    for (const r of records) {
      const key = `${r.productTitle}::${r.reason}`;
      const existing = productReasonMap.get(key) || { count: 0, quantity: 0 };
      existing.count += 1;
      existing.quantity += r.quantity;
      productReasonMap.set(key, existing);
    }

    // Classic Cotton T-Shirt has 2 different reasons
    expect(productReasonMap.get("Classic Cotton T-Shirt::Sizing too small")).toEqual({
      count: 1,
      quantity: 1,
    });
    expect(productReasonMap.get("Classic Cotton T-Shirt::Not as described")).toEqual({
      count: 1,
      quantity: 1,
    });
  });

  it("filters by date range", async () => {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const recent = await db.returnReasonRecord.findMany({
      where: { shop: SHOP, createdAt: { gte: since } },
    });

    // Only records within last 7 days: items 1 (5 days ago) and 4 (3 days ago)
    expect(recent).toHaveLength(2);
  });
});
