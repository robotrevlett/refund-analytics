import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getDashboardMetrics, getTopRefundedProducts, getRefundTrend, getProductRefunds } from "../../app/models/refund.server.js";

const SHOP = "test-store.myshopify.com";

function getDb() {
  return global.__testPrisma || new PrismaClient();
}

async function seedData(db) {
  await db.shop.create({
    data: { id: SHOP, currency: "USD", syncStatus: "completed" },
  });

  const now = new Date();

  // Seed orders
  const orders = [
    {
      id: "gid://shopify/Order/1",
      shop: SHOP,
      name: "#1001",
      orderDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      totalAmount: 200.0,
      currency: "USD",
      financialStatus: "PARTIALLY_REFUNDED",
    },
    {
      id: "gid://shopify/Order/2",
      shop: SHOP,
      name: "#1002",
      orderDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      totalAmount: 300.0,
      currency: "USD",
      financialStatus: "REFUNDED",
    },
    {
      id: "gid://shopify/Order/3",
      shop: SHOP,
      name: "#1003",
      orderDate: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000),
      totalAmount: 500.0,
      currency: "USD",
      financialStatus: "REFUNDED",
    },
    {
      id: "gid://shopify/Order/4",
      shop: SHOP,
      name: "#1004",
      orderDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      totalAmount: 150.0,
      currency: "USD",
      financialStatus: "PAID",
    },
  ];

  for (const order of orders) {
    await db.orderRecord.create({ data: order });
  }

  // Seed refunds
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
}

describe("getDashboardMetrics", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedData(db);
  });

  it("computes gross sales, refunds, net revenue, and refund rate for 30 days", async () => {
    const metrics = await getDashboardMetrics(SHOP, 30);

    // Orders within 30 days: #1001 (200), #1002 (300), #1004 (150) = 650
    // Refunds within 30 days: Refund/1 (50), Refund/2 (79.99) = 129.99
    expect(metrics.grossSales).toBe(650);
    expect(metrics.totalRefunds).toBe(129.99);
    expect(metrics.netRevenue).toBe(520.01);
    expect(metrics.refundRate).toBeCloseTo(20.0, 0); // 129.99/650 ≈ 20%
    expect(metrics.currency).toBe("USD");
  });

  it("includes older data in 90-day range", async () => {
    const metrics = await getDashboardMetrics(SHOP, 90);

    // All 4 orders: 200 + 300 + 500 + 150 = 1150
    // All 3 refunds: 50 + 79.99 + 149.99 = 279.98
    expect(metrics.grossSales).toBe(1150);
    expect(metrics.totalRefunds).toBe(279.98);
    expect(metrics.netRevenue).toBe(870.02);
  });

  it("returns zero metrics when no data in range", async () => {
    const metrics = await getDashboardMetrics(SHOP, 1);

    expect(metrics.grossSales).toBe(0);
    expect(metrics.totalRefunds).toBe(0);
    expect(metrics.netRevenue).toBe(0);
    expect(metrics.refundRate).toBe(0);
  });
});

describe("getTopRefundedProducts", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedData(db);
  });

  it("aggregates products by refund amount across all refunds", async () => {
    const products = await getTopRefundedProducts(SHOP, 90, 10);

    // Winter Puffer Jacket: 149.99 (from refund 3)
    // Slim Fit Jeans: 20.01 + 79.99 = 100.00 (from refunds 1 and 2)
    // Classic Cotton T-Shirt: 29.99 (from refund 1)
    expect(products[0].title).toBe("Winter Puffer Jacket");
    expect(products[0].sku).toBe("APP-JKT-003");
    expect(products[0].amount).toBe(149.99);
    expect(products[1].title).toBe("Slim Fit Jeans");
    expect(products[1].sku).toBe("APP-JNS-002");
    expect(products[1].amount).toBe(100);
    expect(products[1].count).toBe(2); // appears in 2 refunds
  });

  it("respects date range", async () => {
    const products = await getTopRefundedProducts(SHOP, 30, 10);

    // Only refunds 1 and 2 are in range — no Winter Puffer Jacket
    const titles = products.map((p) => p.title);
    expect(titles).not.toContain("Winter Puffer Jacket");
    expect(titles).toContain("Slim Fit Jeans");
  });

  it("respects limit", async () => {
    const products = await getTopRefundedProducts(SHOP, 90, 1);
    expect(products).toHaveLength(1);
  });
});

describe("getRefundTrend", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedData(db);
  });

  it("groups refunds by refund date", async () => {
    const trend = await getRefundTrend(SHOP, 90);

    // 3 refunds on 3 different dates
    expect(trend).toHaveLength(3);
    expect(trend[0].count).toBe(1);
    // Sorted chronologically
    expect(trend[0].date < trend[1].date).toBe(true);
  });

  it("uses refund date not order date for grouping", async () => {
    const trend = await getRefundTrend(SHOP, 30);

    // Only 2 refunds within 30 days (refund 3 is 60 days ago)
    expect(trend).toHaveLength(2);
  });
});

describe("getProductRefunds", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedData(db);
  });

  it("flattens refund line items into per-product rows", async () => {
    const rows = await getProductRefunds(SHOP, 90);

    // Refund 1 has 2 items, refund 2 has 1, refund 3 has 1 = 4 total rows
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveProperty("product");
    expect(rows[0]).toHaveProperty("sku");
    expect(rows[0]).toHaveProperty("quantity");
    expect(rows[0]).toHaveProperty("amount");
    expect(rows[0]).toHaveProperty("date");
    expect(rows[0]).toHaveProperty("orderName");
  });

  it("sorts by refund date descending (most recent first)", async () => {
    const rows = await getProductRefunds(SHOP, 90);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].date <= rows[i - 1].date).toBe(true);
    }
  });

  it("respects date range", async () => {
    const all = await getProductRefunds(SHOP, 90);
    const recent = await getProductRefunds(SHOP, 7);
    expect(recent.length).toBeLessThan(all.length);
    // Only refund 1 (5 days ago) with 2 line items
    expect(recent).toHaveLength(2);
  });

  it("handles malformed lineItems JSON gracefully", async () => {
    await db.refundRecord.create({
      data: {
        id: "gid://shopify/Refund/bad",
        shop: SHOP,
        orderId: "gid://shopify/Order/99",
        orderName: "#1099",
        refundDate: new Date(),
        amount: 10,
        currency: "USD",
        lineItems: "not valid json",
      },
    });

    const rows = await getProductRefunds(SHOP, 90);
    // Should still return original 4 rows, skipping the bad one
    expect(rows).toHaveLength(4);
  });
});

describe("edge cases", () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await seedData(db);
  });

  it("handles $0 refund amounts without affecting totals", async () => {
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

    const metrics = await getDashboardMetrics(SHOP, 90);
    // $0 refund should not change total refund amount
    expect(metrics.totalRefunds).toBe(279.98);
  });

  it("counts unique orders with refunds", async () => {
    const metrics = await getDashboardMetrics(SHOP, 90);
    // 3 refunds across 3 different orders
    expect(metrics.ordersWithRefunds).toBe(3);
  });

  it("sums amounts without float drift (0.1 + 0.2 style)", async () => {
    // Create refunds with values that would cause float issues: 0.10 + 0.20 = 0.30 exactly
    await db.refundRecord.create({
      data: {
        id: "gid://shopify/Refund/drift1",
        shop: SHOP,
        orderId: "gid://shopify/Order/1",
        orderName: "#1001",
        refundDate: new Date(),
        amount: 0.10,
        currency: "USD",
        lineItems: JSON.stringify([{ sku: "X", title: "X", quantity: 1, amount: "0.10" }]),
      },
    });
    await db.refundRecord.create({
      data: {
        id: "gid://shopify/Refund/drift2",
        shop: SHOP,
        orderId: "gid://shopify/Order/1",
        orderName: "#1001",
        refundDate: new Date(),
        amount: 0.20,
        currency: "USD",
        lineItems: JSON.stringify([{ sku: "X", title: "X", quantity: 1, amount: "0.20" }]),
      },
    });

    const metrics = await getDashboardMetrics(SHOP, 90);
    // With Decimal storage, 279.98 + 0.10 + 0.20 = 280.28 exactly
    expect(metrics.totalRefunds).toBe(280.28);
  });

  it("preserves cent precision in per-product aggregation", async () => {
    // Create multiple refunds with amounts that challenge float addition
    for (let i = 0; i < 10; i++) {
      await db.refundRecord.create({
        data: {
          id: `gid://shopify/Refund/cent${i}`,
          shop: SHOP,
          orderId: "gid://shopify/Order/99",
          orderName: "#1099",
          refundDate: new Date(),
          amount: 33.33,
          currency: "USD",
          lineItems: JSON.stringify([{ sku: "CENT-TEST", title: "Cent Test", quantity: 1, amount: "33.33" }]),
        },
      });
    }

    const products = await getTopRefundedProducts(SHOP, 90, 20);
    const centProduct = products.find((p) => p.sku === "CENT-TEST");
    // 10 × 33.33 = 333.30 exactly (would drift with float accumulation)
    expect(centProduct.amount).toBe(333.3);
    expect(centProduct.count).toBe(10);
  });
});
