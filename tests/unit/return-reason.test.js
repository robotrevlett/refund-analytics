import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getReturnReasonBreakdown,
  getReturnReasonTrend,
  getReturnReasonsByProduct,
} from "../../app/models/return-reason.server.js";

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

describe("getReturnReasonBreakdown", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedReturnReasons(db);
  });

  it("groups by reason with correct counts and quantities", async () => {
    const result = await getReturnReasonBreakdown(SHOP, 30);

    // "Sizing too small" has 2 records (qty 1 + 2 = 3)
    const sizing = result.find((r) => r.reason === "Sizing too small");
    expect(sizing).toBeDefined();
    expect(sizing.count).toBe(2);
    expect(sizing.quantity).toBe(3);
    expect(sizing.category).toBe("Sizing");

    // "Defective / damaged" has 1 record (qty 1)
    const defective = result.find((r) => r.reason === "Defective / damaged");
    expect(defective.count).toBe(1);
    expect(defective.quantity).toBe(1);
  });

  it("sorts by count descending", async () => {
    const result = await getReturnReasonBreakdown(SHOP, 30);
    expect(result[0].reason).toBe("Sizing too small"); // count 2 — highest
  });

  it("respects date range", async () => {
    const result = await getReturnReasonBreakdown(SHOP, 7);
    // Only records within last 7 days: items 1 (5d ago) and 4 (3d ago)
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.reason).sort()).toEqual([
      "Not as described",
      "Sizing too small",
    ]);
  });

  it("returns empty array for shop with no data", async () => {
    const result = await getReturnReasonBreakdown("nonexistent.myshopify.com", 30);
    expect(result).toEqual([]);
  });
});

describe("getReturnReasonTrend", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedReturnReasons(db);
  });

  it("groups by date and reason", async () => {
    const result = await getReturnReasonTrend(SHOP, 30);

    // 4 records across different dates and reasons
    expect(result.length).toBeGreaterThan(0);
    // Each entry should have date, reason, count, quantity
    for (const entry of result) {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("reason");
      expect(entry).toHaveProperty("count");
      expect(entry).toHaveProperty("quantity");
    }
  });

  it("sorts by date ascending", async () => {
    const result = await getReturnReasonTrend(SHOP, 30);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it("respects date range", async () => {
    const all = await getReturnReasonTrend(SHOP, 90);
    const recent = await getReturnReasonTrend(SHOP, 7);
    expect(recent.length).toBeLessThanOrEqual(all.length);
  });
});

describe("getReturnReasonsByProduct", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedReturnReasons(db);
  });

  it("groups by product and reason", async () => {
    const result = await getReturnReasonsByProduct(SHOP, 30);

    // Classic Cotton T-Shirt has 2 different reasons
    const tshirtSizing = result.find(
      (r) => r.product === "Classic Cotton T-Shirt" && r.reason === "Sizing too small",
    );
    expect(tshirtSizing).toBeDefined();
    expect(tshirtSizing.count).toBe(1);
    expect(tshirtSizing.sku).toBe("APP-TSH-001");

    const tshirtDesc = result.find(
      (r) => r.product === "Classic Cotton T-Shirt" && r.reason === "Not as described",
    );
    expect(tshirtDesc).toBeDefined();
    expect(tshirtDesc.count).toBe(1);
  });

  it("sorts by quantity descending", async () => {
    const result = await getReturnReasonsByProduct(SHOP, 30);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].quantity <= result[i - 1].quantity).toBe(true);
    }
  });

  it("includes sku field", async () => {
    const result = await getReturnReasonsByProduct(SHOP, 30);
    for (const entry of result) {
      expect(entry).toHaveProperty("sku");
    }
  });
});
