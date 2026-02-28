import db from "../db.server.js";
import { daysAgo } from "../utils.server.js";

export async function getDashboardMetrics(shop, days = 30) {
  const since = daysAgo(days);

  const [refunds, orders, shopRecord] = await Promise.all([
    db.refundRecord.findMany({
      where: { shop, refundDate: { gte: since } },
      select: { amount: true, orderId: true },
    }),
    db.orderRecord.findMany({
      where: { shop, orderDate: { gte: since } },
      select: { totalAmount: true },
    }),
    db.shop.findUnique({ where: { id: shop } }),
  ]);

  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
  const grossSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const netRevenue = grossSales - totalRefunds;
  const refundRate = grossSales > 0 ? (totalRefunds / grossSales) * 100 : 0;
  const currency = shopRecord?.currency || "USD";

  return {
    grossSales,
    totalRefunds,
    netRevenue,
    refundRate,
    refundCount: refunds.length,
    ordersWithRefunds: new Set(refunds.map((r) => r.orderId)).size,
    currency,
  };
}

export async function getTopRefundedProducts(shop, days = 30, limit = 10) {
  const since = daysAgo(days);

  const refunds = await db.refundRecord.findMany({
    where: { shop, refundDate: { gte: since } },
    select: { lineItems: true },
  });

  // Aggregate by SKU (falls back to title if no SKU)
  const productMap = new Map();

  for (const refund of refunds) {
    let items;
    try {
      items = JSON.parse(refund.lineItems);
    } catch {
      continue;
    }

    for (const item of items) {
      const key = item.sku || item.title || "Unknown";
      const title = item.title || "Unknown";
      const existing = productMap.get(key) || { title, sku: item.sku || "", count: 0, amount: 0 };
      existing.count += item.quantity || 1;
      existing.amount += item.amount || 0;
      productMap.set(key, existing);
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export async function getRefundTrend(shop, days = 30) {
  const since = daysAgo(days);

  const refunds = await db.refundRecord.findMany({
    where: { shop, refundDate: { gte: since } },
    select: { refundDate: true, amount: true },
    orderBy: { refundDate: "asc" },
  });

  // Group by date (YYYY-MM-DD)
  const dateMap = new Map();

  for (const refund of refunds) {
    const date = refund.refundDate.toISOString().split("T")[0];
    const existing = dateMap.get(date) || { date, count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += refund.amount;
    dateMap.set(date, existing);
  }

  return Array.from(dateMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}

export async function getProductRefunds(shop, days = 30) {
  const since = daysAgo(days);

  const refunds = await db.refundRecord.findMany({
    where: { shop, refundDate: { gte: since } },
    select: { lineItems: true, refundDate: true, orderName: true, reason: true },
    orderBy: { refundDate: "desc" },
  });

  // Flatten into per-product rows
  const rows = [];

  for (const refund of refunds) {
    let items;
    try {
      items = JSON.parse(refund.lineItems);
    } catch {
      continue;
    }

    for (const item of items) {
      rows.push({
        product: item.title || "Unknown",
        sku: item.sku || "",
        quantity: item.quantity || 1,
        amount: item.amount || 0,
        date: refund.refundDate.toISOString().split("T")[0],
        orderName: refund.orderName,
        reason: refund.reason || "Unknown",
      });
    }
  }

  return rows;
}

