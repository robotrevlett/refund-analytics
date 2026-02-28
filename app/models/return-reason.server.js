import db from "../db.server.js";
import { daysAgo } from "../utils.server.js";

export async function getReturnReasonBreakdown(shop, days = 30) {
  const since = daysAgo(days);

  const records = await db.returnReasonRecord.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { reason: true, category: true, quantity: true },
  });

  // Group by reason
  const reasonMap = new Map();

  for (const record of records) {
    const key = record.reason || "Unknown";
    const existing = reasonMap.get(key) || {
      reason: key,
      category: record.category || "Other",
      count: 0,
      quantity: 0,
    };
    existing.count += 1;
    existing.quantity += record.quantity;
    reasonMap.set(key, existing);
  }

  return Array.from(reasonMap.values()).sort((a, b) => b.count - a.count);
}

export async function getReturnReasonTrend(shop, days = 30) {
  const since = daysAgo(days);

  const records = await db.returnReasonRecord.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { reason: true, createdAt: true, quantity: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date + reason
  const trendMap = new Map();

  for (const record of records) {
    const date = record.createdAt.toISOString().split("T")[0];
    const key = `${date}::${record.reason}`;
    const existing = trendMap.get(key) || {
      date,
      reason: record.reason,
      count: 0,
      quantity: 0,
    };
    existing.count += 1;
    existing.quantity += record.quantity;
    trendMap.set(key, existing);
  }

  return Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export async function getReturnReasonsByProduct(shop, days = 30) {
  const since = daysAgo(days);

  const records = await db.returnReasonRecord.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { productTitle: true, sku: true, reason: true, quantity: true },
  });

  // Group by product + reason
  const productReasonMap = new Map();

  for (const record of records) {
    const key = `${record.productTitle}::${record.reason}`;
    const existing = productReasonMap.get(key) || {
      product: record.productTitle,
      sku: record.sku || "",
      reason: record.reason,
      count: 0,
      quantity: 0,
    };
    existing.count += 1;
    existing.quantity += record.quantity;
    productReasonMap.set(key, existing);
  }

  return Array.from(productReasonMap.values()).sort(
    (a, b) => b.quantity - a.quantity,
  );
}

